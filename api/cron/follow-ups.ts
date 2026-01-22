import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cron job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Follow-up timing configuration (in days)
const FOLLOW_UP_CONFIG = {
  quote_reminder: 3,       // 3 days after quote sent with no response
  quote_expiring: 2,       // 2 days before quote expires
  invoice_reminder: 7,     // 7 days after invoice sent if unpaid
  invoice_overdue: 1,      // 1 day after due date
  review_request: 7,       // 7 days after project completed
  maintenance_reminder: 30 // 30 days after project completed
};

type FollowUpType = keyof typeof FOLLOW_UP_CONFIG;

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
      // Get user's company settings
      const { data: settings } = await supabase
        .from('settings')
        .select('company_name, company_email')
        .eq('user_id', user.id)
        .single();

      const companyName = settings?.company_name || 'Lighting Company';
      const companyEmail = settings?.company_email || user.email;

      // Find projects needing follow-ups
      const followUps = await findProjectsNeedingFollowUp(supabase, user.id, now);

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
  now: Date
): Promise<any[]> {
  const followUps: any[] = [];

  // Get all projects with clients for this user
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name,
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

    // Quote reminder: 3 days after sent, no approval
    if (project.quote_sent_at && !project.quote_approved_at) {
      const sentDate = new Date(project.quote_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSent >= FOLLOW_UP_CONFIG.quote_reminder) {
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

    // Quote expiring: 2 days before expiration
    if (project.quote_expires_at && !project.quote_approved_at) {
      const expiresDate = new Date(project.quote_expires_at);
      const daysUntilExpiry = Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= FOLLOW_UP_CONFIG.quote_expiring && daysUntilExpiry > 0) {
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

    // Invoice reminder: 7 days after sent, unpaid
    if (project.invoice_sent_at && !project.invoice_paid_at) {
      const sentDate = new Date(project.invoice_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceSent >= FOLLOW_UP_CONFIG.invoice_reminder) {
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

    // Review request: 7 days after completion
    if (project.completed_at) {
      const completedDate = new Date(project.completed_at);
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCompletion >= FOLLOW_UP_CONFIG.review_request && daysSinceCompletion < FOLLOW_UP_CONFIG.maintenance_reminder) {
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
      if (daysSinceCompletion >= FOLLOW_UP_CONFIG.maintenance_reminder) {
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
