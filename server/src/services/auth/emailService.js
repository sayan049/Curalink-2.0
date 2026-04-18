import { getEmailTransporter, emailTemplates } from '../../config/email.js';

export const sendEmail = async (email, name, otp, purpose) => {
  try {
    const transporter = getEmailTransporter();
    const emailContent = emailTemplates.otpEmail(name, otp, purpose);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

export const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = getEmailTransporter();
    const emailContent = emailTemplates.welcomeEmail(name);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

// ✅ NEW: Send password reset email
export const sendResetPasswordEmail = async (email, name, resetLink) => {
  try {
    const transporter = getEmailTransporter();
    const emailContent = emailTemplates.resetPasswordEmail(name, resetLink);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    console.log(`✅ Reset password email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Reset email error:', error);
    throw new Error('Failed to send reset email');
  }
};