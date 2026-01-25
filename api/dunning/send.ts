import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabase } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId: clerkUserId } = req.query;
  const { projectId, template, customSubject, customMessage } = req.body;

  if (!clerkUserId || typeof clerkUserId !== 'string') {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (!projectId || !template) {
    return res.status(400).json({ error: 'Missing projectId or template' });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Look up Supabase user ID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUserId = userData.id;

    // Get user's company settings
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name, company_email')
      .eq('user_id', supabaseUserId)
      .single();

    const companyName = settings?.company_name || 'Our Company';
    const fromEmail = settings?.company_email || userData.email;

    // Get the project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', supabaseUserId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate days overdue
    const invoiceData = project.invoice_data || {};
    const dueDate = invoiceData.dueDate || project.created_at;
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));

    // Prepare template data
    const templateData: TemplateData = {
      clientName: project.client_name || project.clientName || 'Valued Customer',
      invoiceNumber: invoiceData.invoiceNumber || project.id.slice(0, 8).toUpperCase(),
      amount: invoiceData.total || project.quote_value || 0,
      dueDate: dueDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      daysOverdue: Math.max(0, daysOverdue),
      companyName,
      paymentUrl: project.payment_url || undefined,
    };

    // Get the template
    const reminderTemplate = REMINDER_TEMPLATES[template];
    if (!reminderTemplate && !customMessage) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    // Build email content
    const subject = customSubject ||
      (reminderTemplate?.subject.replace('{invoiceNumber}', templateData.invoiceNumber) ||
       `Payment Reminder: Invoice #${templateData.invoiceNumber}`);

    const htmlBody = customMessage || reminderTemplate?.getBody(templateData) || '';

    // Get client email
    const clientEmail = project.client_email || project.clientEmail;
    if (!clientEmail) {
      return res.status(400).json({ error: 'No client email found for this project' });
    }

    // Send the email using Resend
    let emailSent = false;
    let emailError: string | null = null;

    if (process.env.RESEND_API_KEY) {
      const fromAddress = `${companyName} <noreply@omnialightscapepro.com>`;

      const { error } = await resend.emails.send({
        from: fromAddress,
        to: clientEmail,
        replyTo: fromEmail,
        subject,
        html: htmlBody,
      });

      if (error) {
        console.error('Resend error:', error);
        emailError = error.message;
      } else {
        emailSent = true;
      }
    } else {
      console.warn('RESEND_API_KEY not configured, email not sent');
      emailError = 'Email service not configured';
    }

    // Log the reminder
    const { data: reminder, error: reminderError } = await supabase
      .from('invoice_reminders')
      .insert({
        user_id: supabaseUserId,
        project_id: projectId,
        project_name: project.name || project.project_name || 'Unnamed Project',
        client_name: templateData.clientName,
        reminder_type: template,
        sent_to: clientEmail,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reminderError) {
      console.error('Error logging reminder:', reminderError);
      // Don't fail the request if logging fails
    }

    return res.status(200).json({
      success: true,
      emailSent,
      emailError,
      reminder: reminder || { template, sent_to: clientEmail },
      message: emailSent ? 'Reminder sent successfully' : `Reminder logged but email not sent${emailError ? `: ${emailError}` : ''}`,
    });

  } catch (error: unknown) {
    console.error('Dunning send error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: 'Internal server error', message });
  }
}
