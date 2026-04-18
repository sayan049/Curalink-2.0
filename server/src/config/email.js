import nodemailer from 'nodemailer';

let transporter = null;

export const createEmailTransporter = () => {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter error:', error.message);
    } else {
      console.log('✅ Email transporter ready');
    }
  });

  return transporter;
};

export const getEmailTransporter = () => {
  if (!transporter) {
    return createEmailTransporter();
  }
  return transporter;
};

export const emailTemplates = {
  // OTP Email
  otpEmail: (name, otp, purpose) => {
    const purposeText = {
      registration: 'complete your registration',
      login: 'log in to your account',
      'password-reset': 'reset your password',
      'email-verification': 'verify your email',
    };

    return {
      subject: '🏥 Your Curalink Verification Code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .otp-box { background: #f7fafc; border: 3px dashed #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 42px; font-weight: 800; color: #667eea; letter-spacing: 12px; font-family: monospace; }
            .footer { background: #f7fafc; padding: 20px 30px; text-align: center; font-size: 14px; color: #718096; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Curalink</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Your verification code to ${purposeText[purpose] || 'continue'} is:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p>This code expires in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
              <p><strong>Do not share this code with anyone.</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Curalink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },

  // Welcome Email
  welcomeEmail: (name) => ({
    subject: '🎉 Welcome to Curalink Medical AI!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
          .content { padding: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🏥 Welcome to Curalink!</h1></div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Your account has been successfully verified! Start exploring medical research now.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // ✅ NEW: Password Reset Email
  resetPasswordEmail: (name, resetLink) => ({
    subject: '🔐 Reset Your Curalink Password',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .logo { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #2d3748; margin-bottom: 10px; }
          .content p { color: #4a5568; line-height: 1.6; }
          .btn-container { text-align: center; margin: 30px 0; }
          .reset-btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .warning { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px 20px; border-radius: 8px; margin: 25px 0; }
          .warning p { color: #742a2a; margin: 0; font-size: 14px; }
          .link-text { background: #f7fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; word-break: break-all; font-size: 12px; color: #667eea; margin: 20px 0; }
          .footer { background: #f7fafc; padding: 20px 30px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; }
          .expiry { text-align: center; color: #e53e3e; font-weight: 600; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐</div>
            <h1>Password Reset</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password for your Curalink account. Click the button below to set a new password:</p>
            
            <div class="btn-container">
              <a href="${resetLink}" class="reset-btn">Reset Password</a>
            </div>
            
            <p class="expiry">⏱️ This link expires in 30 minutes</p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-text">${resetLink}</div>
            
            <div class="warning">
              <p><strong>🔒 Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Curalink Medical AI. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};