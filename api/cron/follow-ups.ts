import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cron job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Default follow-up timing configuration (in days)
const DEFAULT_FOLLOW_UP_CONFIG = {
  quote_reminder: 3,       // 3 days after quote sent with no response
  quote_expiring: 2,       // 2 days before quote expires
  invoice_reminder: 7,     // 7 days after invoice sent if unpaid
  invoice_overdue: 1,      // 1 day after due date
  pre_installation: 1,     // 1 day before scheduled installation
  review_request: 7,       // 7 days after project completed
  maintenance_reminder: 30 // 30 days after project completed
};

// User-configurable follow-up settings interface
interface UserFollowUpSettings {
  follow_up_quote_reminder_days?: number;
  follow_up_quote_expiring_days?: number;
  follow_up_invoice_reminder_days?: number;
  follow_up_invoice_overdue_days?: number;
  follow_up_pre_installation_days?: number;
  follow_up_enable_quote_reminders?: boolean;
  follow_up_enable_invoice_reminders?: boolean;
  follow_up_enable_pre_install_reminders?: boolean;
  follow_up_sms_enabled?: boolean;
}

// Merge user settings with defaults
function getFollowUpConfig(userSettings?: UserFollowUpSettings) {
  return {
    quote_reminder: userSettings?.follow_up_quote_reminder_days ?? DEFAULT_FOLLOW_UP_CONFIG.quote_reminder,
    quote_expiring: userSettings?.follow_up_quote_expiring_days ?? DEFAULT_FOLLOW_UP_CONFIG.quote_expiring,
    invoice_reminder: userSettings?.follow_up_invoice_reminder_days ?? DEFAULT_FOLLOW_UP_CONFIG.invoice_reminder,
    invoice_overdue: userSettings?.follow_up_invoice_overdue_days ?? DEFAULT_FOLLOW_UP_CONFIG.invoice_overdue,
    pre_installation: userSettings?.follow_up_pre_installation_days ?? DEFAULT_FOLLOW_UP_CONFIG.pre_installation,
    review_request: DEFAULT_FOLLOW_UP_CONFIG.review_request,
    maintenance_reminder: DEFAULT_FOLLOW_UP_CONFIG.maintenance_reminder,
    // Enable flags
    enableQuoteReminders: userSettings?.follow_up_enable_quote_reminders ?? true,
    enableInvoiceReminders: userSettings?.follow_up_enable_invoice_reminders ?? true,
    enablePreInstallReminders: userSettings?.follow_up_enable_pre_install_reminders ?? true,
    enableSmsForOverdue: userSettings?.follow_up_sms_enabled ?? false
  };
}

type FollowUpType = keyof typeof DEFAULT_FOLLOW_UP_CONFIG;

interface ScheduleInfo {
  scheduledDate: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'custom';
  customTime?: string;
  installationNotes?: string;
}

interface ProjectFollowUp {
  projectId: string;
  projectName: string;
  userId: string;
  clientEmail: string;
  clientName: string;
  companyName: string;
  companyEmail: string;
  type: FollowUpType;
  shareToken?: string;
  scheduleData?: ScheduleInfo;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests (for cron services)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const now = new Date();
  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    // Get all users with their settings
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, clerk_user_id');

    if (usersError) throw usersError;

    for (const user of users || []) {
      // Get user's company settings including follow-up preferences
      const { data: settings } = await supabase
        .from('settings')
        .select(`
          company_name, company_email,
          follow_up_quote_reminder_days,
          follow_up_quote_expiring_days,
          follow_up_invoice_reminder_days,
          follow_up_invoice_overdue_days,
          follow_up_pre_installation_days,
          follow_up_enable_quote_reminders,
          follow_up_enable_invoice_reminders,
          follow_up_enable_pre_install_reminders,
          follow_up_sms_enabled
        `)
        .eq('user_id', user.id)
        .single();

      const companyName = settings?.company_name || 'Lighting Company';
      const companyEmail = settings?.company_email || user.email;
      const followUpConfig = getFollowUpConfig(settings || undefined);

      // Find projects needing follow-ups using user's settings
      const followUps = await findProjectsNeedingFollowUp(supabase, user.id, now, followUpConfig);

      for (const followUp of followUps) {
        results.processed++;

        // Check if this follow-up was already sent
        const { data: existingLog } = await supabase
          .from('follow_up_log')
          .select('id')
          .eq('project_id', followUp.projectId)
          .eq('type', followUp.type)
          .single();

        if (existingLog) {
          results.skipped++;
          continue;
        }

        // Send the follow-up email
        try {
          await sendFollowUpEmail({
            ...followUp,
            companyName,
            companyEmail
          });

          // Log the sent follow-up
          await supabase.from('follow_up_log').insert({
            user_id: user.id,
            project_id: followUp.projectId,
            client_id: followUp.clientId || null,
            type: followUp.type
          });

          results.sent++;
        } catch (emailError: any) {
          results.errors.push(`${followUp.type} for ${followUp.projectName}: ${emailError.message}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Follow-ups processed: ${results.processed}, sent: ${results.sent}, skipped: ${results.skipped}`,
      results
    });

  } catch (error: any) {
    console.error('Follow-up cron error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

async function findProjectsNeedingFollowUp(
  supabase: any,
  userId: string,
  now: Date,
  config: ReturnType<typeof getFollowUpConfig>
): Promise<any[]> {
  const followUps: any[] = [];

  // Get all projects with clients for this user
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, prompt_config,
      quote_sent_at, quote_expires_at, quote_approved_at,
      invoice_sent_at, invoice_paid_at,
      completed_at,
      client_id,
      clients!inner(id, name, email)
    `)
    .eq('user_id', userId)
    .not('client_id', 'is', null);

  for (const project of projects || []) {
    const client = project.clients;
    if (!client?.email) continue;

    // Quote reminder: X days after sent, no approval (if enabled)
    if (config.enableQuoteReminders && project.quote_sent_at && !project.quote_approved_at) {
      const sentDate = new Date(project.quote_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSent >= config.quote_reminder) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'quote_reminder'
        });
      }
    }

    // Quote expiring: X days before expiration (if enabled)
    if (config.enableQuoteReminders && project.quote_expires_at && !project.quote_approved_at) {
      const expiresDate = new Date(project.quote_expires_at);
      const daysUntilExpiry = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= config.quote_expiring && daysUntilExpiry > 0) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'quote_expiring'
        });
      }
    }

    // Invoice reminder: X days after sent, unpaid (if enabled)
    if (config.enableInvoiceReminders && project.invoice_sent_at && !project.invoice_paid_at) {
      const sentDate = new Date(project.invoice_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSent >= config.invoice_reminder) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'invoice_reminder'
        });
      }
    }

    // Pre-installation reminder: X days before scheduled date (if enabled)
    const schedule = project.prompt_config?.schedule;
    if (config.enablePreInstallReminders && schedule?.scheduledDate && project.prompt_config?.status === 'scheduled') {
      const scheduledDate = new Date(schedule.scheduledDate);
      const daysUntilInstall = Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilInstall === config.pre_installation) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'pre_installation',
          scheduleData: schedule
        });
      }
    }

    // Review request: 7 days after completion
    if (project.completed_at) {
      const completedDate = new Date(project.completed_at);
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCompletion >= config.review_request && daysSinceCompletion < config.maintenance_reminder) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'review_request'
        });
      }
    }

    // Maintenance reminder: 30 days after completion
    if (project.completed_at) {
      const completedDate = new Date(project.completed_at);
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCompletion >= config.maintenance_reminder) {
        followUps.push({
          projectId: project.id,
          projectName: project.name,
          userId,
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.name,
          type: 'maintenance_reminder'
        });
      }
    }
  }

  return followUps;
}

async function sendFollowUpEmail(followUp: ProjectFollowUp): Promise<void> {
  const templates = getEmailTemplates(followUp);

  await resend.emails.send({
    from: 'Omnia LightScape <noreply@omnialightscapepro.com>',
    to: followUp.clientEmail,
    replyTo: followUp.companyEmail,
    subject: templates.subject,
    html: templates.html
  });
}

function getEmailTemplates(followUp: ProjectFollowUp) {
  const { clientName, projectName, companyName, companyEmail, type } = followUp;

  const templates: Record<FollowUpType, { subject: string; html: string }> = {
    quote_reminder: {
      subject: `${companyName} - Following up on your quote`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #F6B45A;">Following Up on Your Quote</h2>
          <p>Hi ${clientName},</p>
          <p>I wanted to follow up on the lighting quote we sent for <strong>${projectName}</strong>.</p>
          <p>If you have any questions or would like to discuss the project further, please don't hesitate to reach out.</p>
          <p>We'd love the opportunity to transform your outdoor space!</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    },
    quote_expiring: {
      subject: `${companyName} - Your quote expires soon`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #F6B45A;">Your Quote Expires Soon</h2>
          <p>Hi ${clientName},</p>
          <p>Just a friendly reminder that your quote for <strong>${projectName}</strong> will expire in the next few days.</p>
          <p>If you'd like to move forward with the project, please let us know before the quote expires.</p>
          <p>We're here to answer any questions you may have!</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    },
    invoice_reminder: {
      subject: `${companyName} - Payment reminder for ${projectName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3B82F6;">Payment Reminder</h2>
          <p>Hi ${clientName},</p>
          <p>This is a friendly reminder that payment is due for <strong>${projectName}</strong>.</p>
          <p>If you've already sent your payment, please disregard this message.</p>
          <p>If you have any questions about your invoice, please reach out.</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    },
    invoice_overdue: {
      subject: `${companyName} - Invoice overdue for ${projectName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #EF4444;">Invoice Overdue</h2>
          <p>Hi ${clientName},</p>
          <p>Your invoice for <strong>${projectName}</strong> is now past due.</p>
          <p>Please arrange payment at your earliest convenience. If you're experiencing any issues, please contact us so we can work together on a solution.</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    },
    pre_installation: {
      subject: `${companyName} - Tomorrow's the day! Your lighting installation reminder`,
      html: (() => {
        const schedule = followUp.scheduleData;
        const timeSlotText: Record<string, string> = {
          morning: '8:00 AM - 12:00 PM',
          afternoon: '12:00 PM - 5:00 PM',
          evening: '5:00 PM - 8:00 PM',
          custom: schedule?.customTime || 'To be confirmed'
        };
        const timeText = schedule ? timeSlotText[schedule.timeSlot] || 'To be confirmed' : 'To be confirmed';
        const dateText = schedule ? new Date(schedule.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Tomorrow';

        return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10B981;">🎉 Tomorrow's the Day!</h2>
          <p>Hi ${clientName},</p>
          <p>Just a friendly reminder that your landscape lighting installation for <strong>${projectName}</strong> is scheduled for tomorrow!</p>
          <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>📅 Date:</strong> ${dateText}</p>
            <p style="margin: 0 0 10px;"><strong>⏰ Time:</strong> ${timeText}</p>
            ${schedule?.installationNotes ? `<p style="margin: 0;"><strong>📝 Notes:</strong> ${schedule.installationNotes}</p>` : ''}
          </div>
          <p><strong>Please ensure:</strong></p>
          <ul>
            <li>Clear access to the installation areas</li>
            <li>Pets are secured if applicable</li>
            <li>Any gate codes or access info is shared with us</li>
          </ul>
          <p>We're excited to bring your lighting vision to life!</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Need to reschedule? Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `;
      })()
    },
    review_request: {
      subject: `${companyName} - How was your lighting installation?`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10B981;">We'd Love Your Feedback!</h2>
          <p>Hi ${clientName},</p>
          <p>It's been about a week since we completed your lighting installation for <strong>${projectName}</strong>.</p>
          <p>We hope you're enjoying your new outdoor lighting! We'd love to hear about your experience.</p>
          <p>If you could take a moment to leave us a review, it would mean a lot to our team.</p>
          <p>Thank you for choosing ${companyName}!</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    },
    maintenance_reminder: {
      subject: `${companyName} - Time for a lighting system checkup?`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #8B5CF6;">Maintenance Reminder</h2>
          <p>Hi ${clientName},</p>
          <p>It's been about a month since we completed your lighting project for <strong>${projectName}</strong>.</p>
          <p>This is a great time to check in on your lighting system:</p>
          <ul>
            <li>Are all fixtures working properly?</li>
            <li>Need any adjustments to lighting angles?</li>
            <li>Considering any additions to your lighting design?</li>
          </ul>
          <p>We're here to help keep your outdoor space looking its best!</p>
          <p>Best regards,<br/>${companyName}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 12px;">Reply to this email or contact us at ${companyEmail}</p>
        </div>
      `
    }
  };

  return templates[type];
}
