const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendWelcomeEmail(email, password) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to CBO CSS Snips',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to CBO CSS Snips!</h1>
          <p>Your account has been created successfully. You can now log in using the following credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>For security reasons, we recommend changing your password after your first login.</p>
          
          <p>Click the link below to log in:</p>
          <a href="${process.env.SITE_URL}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In to CBO CSS Snips</a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this account, please ignore this email.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', email);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.SITE_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request - CBO CSS Snips',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          
          <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          
          <p>This link will expire in 1 hour.</p>
          
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendPasswordResetNotification(email, newPassword) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset - CBO CSS Snips',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset</h1>
          <p>Your password has been reset by an administrator. You can now log in using the following credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>New Password:</strong> ${newPassword}</p>
          </div>
          
          <p>For security reasons, we recommend changing your password after logging in.</p>
          
          <p>Click the link below to log in:</p>
          <a href="${process.env.SITE_URL}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In to CBO CSS Snips</a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this password reset, please contact the administrator immediately.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Password reset notification sent to:', email);
    } catch (error) {
      console.error('Error sending password reset notification:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();