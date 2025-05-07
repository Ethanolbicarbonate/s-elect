// lib/email.js
import nodemailer from 'nodemailer';

// Configure Nodemailer transporter
// For local development with Ethereal:
// let transporter;
// async function getEtherealTransporter() {
//     if (!transporter) {
//         const testAccount = await nodemailer.createTestAccount();
//         transporter = nodemailer.createTransport({
//             host: 'smtp.ethereal.email',
//             port: 587,
//             secure: false, // true for 465, false for other ports
//             auth: {
//                 user: testAccount.user, // generated ethereal user
//                 pass: testAccount.pass, // generated ethereal password
//             },
//         });
//     }
//     return transporter;
// }

// For production (e.g., SendGrid - set environment variables on Vercel)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    secure: parseInt(process.env.EMAIL_SERVER_PORT || "587") === 465, // true for port 465, false for others
});


export async function sendVerificationEmail(to, token) {
  const subject = 'Verify your sELECT Account Email';
  const verificationUrl = `${process.env.NEXTAUTH_URL}/student-signup/verify?token=${token}&email=${encodeURIComponent(to)}`; // Construct verification URL
  const htmlContent = `
    <h1>Verify Your Email</h1>
    <p>Thank you for signing up for sELECT.</p>
    <p>Your verification code is: <strong>${token}</strong></p>
    <p>Or click this link to verify (not typically done with OTPs, but an option): <a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>This code will expire in 10 minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  const textContent = `Verify your sELECT account. Your verification code is: ${token}. This code will expire in 10 minutes. Or visit ${verificationUrl}`;

  // For Ethereal local testing:
  // const mailTransporter = await getEtherealTransporter();

  // For production:
  const mailTransporter = transporter;

  try {
    const info = await mailTransporter.sendMail({
      from: `"sELECT System" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Verification email sent: %s', info.messageId);
    // For Ethereal: console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: 'Failed to send verification email.' };
  }
}