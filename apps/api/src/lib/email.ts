import nodemailer from 'nodemailer';

// Email configuration
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // For development, log emails to console
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  const transporter = createTransporter();

  // In development, just log the email
  if (!transporter) {
    console.log('📧 Email would be sent:', {
      to,
      subject,
      html,
      from: process.env.SMTP_FROM || 'Uptime Monitor <noreply@localhost>',
    });
    return { success: true, messageId: 'dev-mode' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Uptime Monitor <noreply@localhost>',
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};

export const sendVerificationEmail = async ({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) => {
  const subject = 'Verify your email address';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify your email address</h2>
      <p>Hi ${user.name || 'there'},</p>
      <p>Thank you for signing up for Uptime Monitor. Please click the button below to verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${url}</p>
      <p>This verification link will expire in 24 hours.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        If you didn't create an account with Uptime Monitor, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `
    Verify your email address
    
    Hi ${user.name || 'there'},
    
    Thank you for signing up for Uptime Monitor. Please visit the following link to verify your email address:
    
    ${url}
    
    This verification link will expire in 24 hours.
    
    If you didn't create an account with Uptime Monitor, you can safely ignore this email.
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
  });
};

export const sendPasswordResetEmail = async ({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) => {
  const subject = 'Reset your password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reset your password</h2>
      <p>Hi ${user.name || 'there'},</p>
      <p>We received a request to reset your password for your Uptime Monitor account. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${url}</p>
      <p>This password reset link will expire in 1 hour.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
      </p>
    </div>
  `;

  const text = `
    Reset your password
    
    Hi ${user.name || 'there'},
    
    We received a request to reset your password for your Uptime Monitor account. Please visit the following link to set a new password:
    
    ${url}
    
    This password reset link will expire in 1 hour.
    
    If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
  });
};