import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cron job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// Email templates for payment reminders
const REMINDER_TEMPLATES: Record<string, { subject: string; getBody: (data: TemplateData) => string }> = {
  friendly_reminder: {
    subject: 'Friendly Reminder: Invoice #{invoiceNumber} Due',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Friendly Reminder</h2>
        <p>Hi ${data.clientName},</p>
        <p>This is a friendly reminder that invoice <strong>#${data.invoiceNumber}</strong> for <strong>$${data.amount.toLocaleString()}</strong> was due on ${data.dueDate}.</p>
        <p>If you've already sent payment, please disregard this message.</p>
        ${data.paymentUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #1d4ed8 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Pay Now</a>
        </div>
        ` : ''}
        <p>Thanks!</p>
        <p>${data.companyName}</p>
      </div>
    `,
  },
  second_reminder: {
    subject: 'Second Notice: Invoice #{invoiceNumber} Past Due',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Second Notice</h2>
        <p>Hi ${data.clientName},</p>
        <p>We noticed that invoice <strong>#${data.invoiceNumber}</strong> for <strong>$${data.amount.toLocaleString()}</strong> is now <strong>${data.daysOverdue} days past due</strong>.</p>
        <p>Please arrange payment at your earliest convenience.</p>
        ${data.paymentUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Pay Now - $${data.amount.toLocaleString()}</a>
        </div>
        ` : ''}
        <p>If you have questions, please reply to this email.</p>
        <p>${data.companyName}</p>
      </div>
    `,
  },
  urgent_reminder: {
    subject: 'Urgent: Invoice #{invoiceNumber} - 2 Weeks Overdue',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Urgent Notice</h2>
        <p>Dear ${data.clientName},</p>
        <p>Invoice <strong>#${data.invoiceNumber}</strong> for <strong>$${data.amount.toLocaleString()}</strong> is now <strong>${data.daysOverdue} days overdue</strong>.</p>
        <p>To avoid any service interruptions, please process payment immediately.</p>
        ${data.paymentUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Pay Now - $${data.amount.toLocaleString()}</a>
        </div>
        ` : ''}
        <p>${data.companyName}</p>
      </div>
    `,
  },
  final_notice: {
    subject: 'Final Notice: Payment Required for Invoice #{invoiceNumber}',
    getBody: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Final Notice</h2>
        <p>Dear ${data.clientName},</p>
        <p>This is a <strong>final notice</strong> regarding invoice <strong>#${data.invoiceNumber}</strong> for <strong>$${data.amount.toLocaleString()}</strong>, which is now <strong>${data.daysOverdue} days past due</strong>.</p>
        <p>Please contact us immediately to discuss payment arrangements.</p>
        ${data.paymentUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Pay Now - $${data.amount.toLocaleString()}</a>
        </div>
        ` : ''}
        <p>Failure to respond may result in additional collection actions.</p>
        <p>${data.companyName}</p>
      </div>
    `,
  },
};

interface TemplateData {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  companyName: string;
  paymentUrl?: string;
}

interface DunningStep {
  days_after_due: number;
  template: string;
  subject?: string;
  channel: string;
}

interface DunningSchedule {
  id: string;
  user_id: string;
  is_active: boolean;
  steps: DunningStep[];
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

  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get all active dunning schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('dunning_schedules')
      .select('*')
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Error fetching dunning schedules:', schedulesError);
      return res.status(500).json({ error: 'Failed to fetch dunning schedules' });
    }

    if (!schedules || schedules.length === 0) {
      return res.status(200).json({ message: 'No active dunning schedules', results });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each user's dunning schedule
    for (const schedule of schedules as DunningSchedule[]) {
      const userId = schedule.user_id;
      const steps = schedule.steps || [];

      if (steps.length === 0) continue;

      // 2. Get user's settings for company info
      const { data: settings } = await supabase
        .from('settings')
        .select('company_name, company_email')
        .eq('user_id', userId)
        .single();

      const companyName = settings?.company_name || 'Our Company';
      const fromEmail = settings?.company_email;

      // 3. Get overdue projects for this user
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'sent');

      if (projectsError || !projects) {
        console.error(`Error fetching projects for user ${userId}:`, projectsError);
        continue;
      }

      // Process each project
      for (const project of projects) {
        results.processed++;

        const invoiceData = project.invoice_data || {};
        const dueDate = invoiceData.dueDate;

        if (!dueDate) {
          results.skipped++;
          continue;
        }

        const dueDateObj = new Date(dueDate);
        dueDateObj.setHours(0, 0, 0, 0);

        // Skip if not overdue
        if (dueDateObj >= today) {
          results.skipped++;
          continue;
        }

        const daysOverdue = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
        const clientEmail = project.client_email || project.clientEmail;

        if (!clientEmail) {
          results.skipped++;
          continue;
        }

        // 4. Find matching step for this project
        for (const step of steps) {
          // Check if this step matches the days overdue
          if (step.days_after_due !== daysOverdue) continue;

          // Check if we already sent this reminder
          const { data: existingReminder } = await supabase
            .from('invoice_reminders')
            .select('id')
            .eq('project_id', project.id)
            .eq('reminder_type', step.template)
            .single();

          if (existingReminder) {
            // Already sent this reminder, skip
            continue;
          }

          // 5. Prepare and send the email
          const template = REMINDER_TEMPLATES[step.template];
          if (!template) continue;

          const templateData: TemplateData = {
            clientName: project.client_name || project.clientName || 'Valued Customer',
            invoiceNumber: invoiceData.invoiceNumber || project.id.slice(0, 8).toUpperCase(),
            amount: invoiceData.total || project.quote_value || 0,
            dueDate: dueDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            daysOverdue,
            companyName,
            paymentUrl: project.payment_url || undefined,
          };

          const subject = (step.subject || template.subject).replace('{invoiceNumber}', templateData.invoiceNumber);
          const htmlBody = template.getBody(templateData);

          const fromAddress = `${companyName} <noreply@omnialightscapepro.com>`;

          try {
            const { error: emailError } = await resend.emails.send({
              from: fromAddress,
              to: clientEmail,
              replyTo: fromEmail || undefined,
              subject,
              html: htmlBody,
            });

            if (emailError) {
              console.error(`Error sending reminder for project ${project.id}:`, emailError);
              results.errors.push(`Project ${project.id}: ${emailError.message}`);
              continue;
            }

            // 6. Log the reminder
            await supabase
              .from('invoice_reminders')
              .insert({
                user_id: userId,
                project_id: project.id,
                project_name: project.name || project.project_name || 'Unnamed Project',
                client_name: templateData.clientName,
                reminder_type: step.template,
                sent_to: clientEmail,
                sent_at: new Date().toISOString(),
              });

            results.sent++;
            console.log(`Sent ${step.template} reminder for project ${project.id} to ${clientEmail}`);
          } catch (err: any) {
            console.error(`Error sending reminder for project ${project.id}:`, err);
            results.errors.push(`Project ${project.id}: ${err.message || 'Unknown error'}`);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.processed} projects, sent ${results.sent} reminders, skipped ${results.skipped}`,
      results,
    });

  } catch (error: any) {
    console.error('Dunning cron job error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      results,
    });
  }
}
