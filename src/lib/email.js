// src/lib/email.js
import nodemailer from 'nodemailer';

// --- Ethereal Configuration ---
let etherealTransporterInstance; // Renamed to avoid confusion
async function getEtherealTransporter() {
    if (!etherealTransporterInstance) {
        try {
            const testAccount = await nodemailer.createTestAccount();
            console.log('Ethereal Test Account CREATED:');
            console.log('User:', testAccount.user);
            console.log('Pass:', testAccount.pass);
            console.log('Host: smtp.ethereal.email');
            console.log('Port: 587');

            etherealTransporterInstance = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        } catch (error) {
            console.error("Failed to create Ethereal test account:", error);
            throw new Error("Could not initialize Ethereal email transporter.");
        }
    }
    return etherealTransporterInstance;
}
// --- End Ethereal Configuration ---

async function createTransporter() {
  if (process.env.NODE_ENV === 'development') {
      console.log("Using Ethereal for email in development.");
      return await getEtherealTransporter(); // Return the Ethereal transporter
  } else {
      // Production: Use transactional email service (e.g., Brevo SMTP)
      // Ensure these environment variables are set on Vercel
      if (
          !process.env.EMAIL_SERVER_HOST ||
          !process.env.EMAIL_SERVER_PORT ||
          !process.env.EMAIL_SERVER_USER ||
          !process.env.EMAIL_SERVER_PASSWORD
          // EMAIL_FROM will be used in the mailOptions, not needed for transporter config itself
      ) {
          console.error("Production email server credentials not fully configured.");
          // In production, if email sending is critical, you might want to throw an error instead
          // throw new Error("Production email credentials missing.");
          return null; // Return null if configuration is incomplete
      }

      console.log("Setting up production email transporter...");
      try {
          const transporter = nodemailer.createTransport({
              host: process.env.EMAIL_SERVER_HOST,
              port: parseInt(process.env.EMAIL_SERVER_PORT, 10), // Ensure port is a number
              secure: process.env.EMAIL_SERVER_PORT === '465', // true for 465, false for other ports (like 587)
              auth: {
                  user: process.env.EMAIL_SERVER_USER, // SMTP username (often account email or API key identifier)
                  pass: process.env.EMAIL_SERVER_PASSWORD, // SMTP password (often an API key)
              },
              // Optional: Allow self-signed certs in staging/testing if needed, NOT recommended for production
              // tls: {
              //     rejectUnauthorized: process.env.NODE_ENV === 'production' // Only reject in production
              // }
          });

          // Optional: Verify connection configuration (good for debugging deployment issues)
          // await transporter.verify();
          // console.log("Production transporter verified successfully.");

          return transporter;

      } catch (error) {
          console.error("Failed to create production email transporter:", error);
          // Depending on how critical email is, you might rethrow or return null
          return null;
      }
  }
}

export async function sendVerificationEmail(to, token) {
    const year = new Date().getFullYear();
    const subject = 'Verify your sELECT Account Email';
    const verificationUrl = `${process.env.NEXTAUTH_URL}/student-signup/verify?token=${token}&email=${encodeURIComponent(to)}`;

    // Define htmlContent and textContent HERE, in the scope of the sending function
    const htmlContent = `
    <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your sELECT Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <tr>
              <td style="padding: 0;">
                <img src="https://s-elect.app/assets/EmailHeader.png" alt="sELECT Header" style="display: block; width: 100%; max-width: 600px; height: auto;">
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 30px 40px;">            
                <p style="margin-bottom: 25px; font-size: 16px;">Thank you for signing up for <span style="color: #006fff; font-weight: bold;">sELECT</span>. To complete your registration, please use the verification code below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background-color: #006fff; border: 1px solid #006fff; border-radius: 10px; color: #ffffff; font-weight: bold; font-size: 24px; padding: 15px 25px; display: inline-block; letter-spacing: 2px;">${token}</div>
                </div>
                
                <p style="margin-bottom: 25px; font-size: 16px; text-align: center;"><strong>This code will expire in 10 minutes.</strong></p>
                
                <p style="color: #666666; font-size: 14px;">If you did not request this verification, please disregard this email or <a href="mailto:support@s-elect.app" style="color: #666666; text-decoration: underline;">contact support</a> if you have concerns.</p>
              </td>
            </tr>
            
            <!-- Divider -->
            <tr>
              <td style="padding: 0 40px;">
                <hr style="border: none; border-top: 1px solid #dddddd; margin: 20px 0;">
              </td>
            </tr>
            
            <!-- Copyright -->
            <tr>
              <td style="padding: 20px; text-align: center; font-size: 12px; color: #666666; background-color: #ffffff;">
                © ${year} sELECT. All rights reserved.<br>
                <span style="color: #999999; font-size: 11px;">This is an automated message, please do not reply to this email.</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <img src="https://s-elect.app/assets/EmailFooter.png" alt="sELECT Header" style="display: block; width: 100%; max-width: 600px; height: auto;">
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const textContent = `Verify your sELECT account. Your verification code is: ${token}. This code will expire in 10 minutes. Or use this link: ${verificationUrl}`;

    try {
      const mailTransporter = await createTransporter();

      if (!mailTransporter) {
          console.error("Mail transporter could not be initialized due to missing credentials.");
          return { success: false, error: "Mail transporter setup failed." };
      }

      // Use EMAIL_FROM env variable for the production 'From' address
      // Keep a distinct 'From' for development via Ethereal if you want
      const fromAddress = process.env.NODE_ENV === 'development'
          ? `"sELECT System (Dev Test)" <dev-noreply@example.com>` // Ethereal often ignores this 'From' but set it anyway
          : process.env.EMAIL_FROM || `"sELECT System" <noreply@${new URL(process.env.NEXTAUTH_URL).hostname}>`; // Use configured EMAIL_FROM or derive from domain


      const mailOptions = {
          from: fromAddress, // The 'From' address
          to: to,
          subject: subject,
          text: textContent,
          html: htmlContent,
      };

      console.log(`Attempting to send email from ${mailOptions.from} to ${mailOptions.to}...`);
      const info = await mailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully.');


      // Log Ethereal preview URL only in development when using Ethereal
      if (process.env.NODE_ENV === 'development' && mailTransporter.options.host === 'smtp.ethereal.email' && nodemailer.getTestMessageUrl(info)) {
           console.log('Preview URL (Ethereal): %s', nodemailer.getTestMessageUrl(info));
           return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
       }

      return { success: true, messageId: info.messageId };

  } catch (error) {
      console.error('Error sending verification email:', error);
      // Provide more specific error details if possible
      let errorMessage = 'Failed to send verification email.';
      if (error.message) errorMessage += ` Details: ${error.message}`;
      if (error.code) errorMessage += ` Code: ${error.code}`;
      if (error.response) errorMessage += ` Response: ${error.response}`;

      return { success: false, error: errorMessage };
  }
}