const nodemailer = require('nodemailer');

/**
 * Email service for sending various types of emails
 */
class EmailService {
  constructor() {
    // Only create transporter if email is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      console.warn('Email service not configured. Email features will be disabled.');
      this.transporter = null;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options) {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email service not configured. Skipping email send.');
      return { messageId: 'email-not-configured' };
    }

    const mailOptions = {
      from: `WhatsApp Clone <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw error in development, just log warning
      if (process.env.NODE_ENV === 'development') {
        console.warn('Email sending failed in development mode. This is expected if email is not configured.');
        return { messageId: 'development-mode-skip' };
      }
      throw new Error('Email could not be sent');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #25D366;">Welcome to WhatsApp Clone!</h2>
        <p>Hello ${user.name},</p>
        <p>Thank you for joining our WhatsApp Clone community. To get started, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>Best regards,<br>The WhatsApp Clone Team</p>
      </div>
    `;

    const text = `
      Welcome to WhatsApp Clone!
      
      Hello ${user.name},
      
      Thank you for joining our WhatsApp Clone community. To get started, please verify your email address by visiting: ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      Best regards,
      The WhatsApp Clone Team
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to WhatsApp Clone - Verify Your Email',
      html,
      text
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #25D366;">Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>You requested a password reset for your WhatsApp Clone account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This reset link will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        <p>Best regards,<br>The WhatsApp Clone Team</p>
      </div>
    `;

    const text = `
      Password Reset Request
      
      Hello ${user.name},
      
      You requested a password reset for your WhatsApp Clone account. Visit this link to reset your password: ${resetUrl}
      
      This reset link will expire in 10 minutes.
      
      If you didn't request this password reset, please ignore this email and your password will remain unchanged.
      
      Best regards,
      The WhatsApp Clone Team
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'WhatsApp Clone - Password Reset Request',
      html,
      text
    });
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #25D366;">Password Reset Successful</h2>
        <p>Hello ${user.name},</p>
        <p>Your password has been successfully reset. You can now log in to your WhatsApp Clone account with your new password.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>Best regards,<br>The WhatsApp Clone Team</p>
      </div>
    `;

    const text = `
      Password Reset Successful
      
      Hello ${user.name},
      
      Your password has been successfully reset. You can now log in to your WhatsApp Clone account with your new password.
      
      If you didn't make this change, please contact our support team immediately.
      
      Best regards,
      The WhatsApp Clone Team
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'WhatsApp Clone - Password Reset Successful',
      html,
      text
    });
  }
}

module.exports = new EmailService();
