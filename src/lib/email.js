// src/lib/email.js
import nodemailer from "nodemailer";

// --- Ethereal Configuration ---
let etherealTransporterInstance; // Renamed to avoid confusion
async function getEtherealTransporter() {
  if (!etherealTransporterInstance) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log("Ethereal Test Account CREATED:");
      console.log("User:", testAccount.user);
      console.log("Pass:", testAccount.pass);
      console.log("Host: smtp.ethereal.email");
      console.log("Port: 587");

      etherealTransporterInstance = nodemailer.createTransport({
        host: "smtp.ethereal.email",
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
  if (process.env.NODE_ENV === "development") {
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
      console.error(
        "Production email server credentials not fully configured."
      );
      // In production, if email sending is critical, you might want to throw an error instead
      // throw new Error("Production email credentials missing.");
      return null; // Return null if configuration is incomplete
    }

    console.log("Setting up production email transporter...");
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT, 10), // Ensure port is a number
        secure: process.env.EMAIL_SERVER_PORT === "465", // true for 465, false for other ports (like 587)
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
  const subject = "Verify your sELECT Account Email";
  const verificationUrl = `${
    process.env.NEXTAUTH_URL
  }/student-signup/verify?token=${token}&email=${encodeURIComponent(to)}`;

  // Define htmlContent and textContent HERE, in the scope of the sending function
  const htmlContent = `
    <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your sELECT Account</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 50px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden;  border: 1px solid #dddddd">
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <img src="https://s-elect.app/assets/EmailHeader.png" alt="sELECT Header" style="display: block; width: 100%; max-width: 600px; height: auto;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0px 40px;">            
              <p style="margin-bottom: 30px; font-size: 16px;">Thank you for signing up for <span style="color: #656565; font-weight: bold;">sELECT</span>.<br> To complete your registration, please use the verification code below:</p>
              
              <div style=" width: 100%;">
                <div style="text-align: center; display: flex; justify-content: center; ; margin-top: 12px">
                  <div style="color: #656565; font-weight: bold; font-size: 24px; display: inline-block;">Verification Code:&nbsp;</div>
                  <div style="color: #006fff; font-weight: bold; font-size: 24px; display: inline-block; letter-spacing: 2px;">
                    ${token}
                  </div>
                </div>
              
                <p style="margin-bottom: 12px; font-size: 12px; text-align: center;"><span style="color: #999999;">This code will expire in 10 minutes</strong></p>
              </div>
              <p style="color: #666666; font-size: 14px;">If you did not request this verification, please disregard this email <br> or email <span style="color: #656565; font-weight: bold;"> support@s-elect.app </span> if you have concerns.</p>
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
      console.error(
        "Mail transporter could not be initialized due to missing credentials."
      );
      return { success: false, error: "Mail transporter setup failed." };
    }

    // Use EMAIL_FROM env variable for the production 'From' address
    // Keep a distinct 'From' for development via Ethereal if you want
    const fromAddress =
      process.env.NODE_ENV === "development"
        ? `"sELECT System (Dev Test)" <dev-noreply@example.com>` // Ethereal often ignores this 'From' but set it anyway
        : process.env.EMAIL_FROM ||
          `"sELECT System" <noreply@${
            new URL(process.env.NEXTAUTH_URL).hostname
          }>`; // Use configured EMAIL_FROM or derive from domain

    const mailOptions = {
      from: fromAddress, // The 'From' address
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    console.log(
      `Attempting to send email from ${mailOptions.from} to ${mailOptions.to}...`
    );
    const info = await mailTransporter.sendMail(mailOptions);
    console.log("Email sent successfully.");

    // Log Ethereal preview URL only in development when using Ethereal
    if (
      process.env.NODE_ENV === "development" &&
      mailTransporter.options.host === "smtp.ethereal.email" &&
      nodemailer.getTestMessageUrl(info)
    ) {
      console.log(
        "Preview URL (Ethereal): %s",
        nodemailer.getTestMessageUrl(info)
      );
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Provide more specific error details if possible
    let errorMessage = "Failed to send verification email.";
    if (error.message) errorMessage += ` Details: ${error.message}`;
    if (error.code) errorMessage += ` Code: ${error.code}`;
    if (error.response) errorMessage += ` Response: ${error.response}`;

    return { success: false, error: errorMessage };
  }
}

// NEW FUNCTION for Password Reset
export async function sendPasswordResetEmail(to, token, userType = "User") {
  // userType for email personalization
  const year = new Date().getFullYear();
  const subject = `Reset Your sELECT Account Password`;
  // The URL should point to a new page for entering OTP and new password
  const resetUrl = `${
    process.env.NEXTAUTH_URL
  }/reset-password?token=${token}&email=${encodeURIComponent(
    to
  )}&type=${userType.toLowerCase()}`;

  const htmlContent = `
    <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your sELECT Password</title>
      </head>
      <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 50px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden;  border: 1px solid #dddddd">
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <img src="https://s-elect.app/assets/PasswordResetHeader.png" alt="sELECT Header" style="display: block; width: 100%; max-width: 600px; height: auto;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0px 40px;">            
              <p style="margin-bottom: 30px; font-size: 16px;">We received a request to reset the password for your <span style="color: #656565; font-weight: bold;">sELECT</span> account associated with this email address. <br> Please use the following One-Time Password (OTP) to proceed:</p>
              
              <div style=" width: 100%;">
                <div style="text-align: center; display: flex; justify-content: center; ; margin-top: 12px">
                  <div style="color: #656565; font-weight: bold; font-size: 24px; display: inline-block;">Password Reset Code:&nbsp;</div>
                  <div style="color: #006fff; font-weight: bold; font-size: 24px; display: inline-block; letter-spacing: 2px;">
                    ${token}
                  </div>
                </div>
              
                <p style="margin-bottom: 12px; font-size: 12px; text-align: center;"><span style="color: #999999;">This code will expire in 10 minutes</strong></p>
              </div>
              <p style="color: #666666; font-size: 14px;">Click this link to reset your password: <a href="${resetUrl}" style="color: #006fff; text-decoration: underline;">Reset Password Link</a></p>
              <p style="color: #666666; font-size: 14px;">If you did not request a password reset, please ignore this email. Your password will remain unchanged. <br> Email <span style="color: #656565; font-weight: bold;"> support@s-elect.app </span> if you have concerns.</p>
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
  const textContent = `Reset your sELECT account password. Your One-Time Password (OTP) is: ${token}. This OTP will expire in 10 minutes. If you did not request this, please ignore this email. You can also visit: ${resetUrl}`;

  try {
    const mailTransporter = await createTransporter();

    if (!mailTransporter) {
      console.error(
        "Mail transporter could not be initialized for password reset."
      );
      return { success: false, error: "Mail transporter setup failed." };
    }

    const fromAddress =
      process.env.NODE_ENV === "development"
        ? `"sELECT System (Dev Test)" <dev-noreply@example.com>`
        : process.env.EMAIL_FROM ||
          `"sELECT System" <noreply@${
            new URL(process.env.NEXTAUTH_URL).hostname
          }>`;

    const mailOptions = {
      from: fromAddress,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    };

    console.log(
      `Attempting to send password reset email from ${mailOptions.from} to ${mailOptions.to}...`
    );
    const info = await mailTransporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully.");

    if (
      process.env.NODE_ENV === "development" &&
      mailTransporter.options.host === "smtp.ethereal.email" &&
      nodemailer.getTestMessageUrl(info)
    ) {
      console.log(
        "Preview URL (Ethereal - Password Reset): %s",
        nodemailer.getTestMessageUrl(info)
      );
      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl(info),
      };
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    let errorMessage = "Failed to send password reset email.";
    if (error.message) errorMessage += ` Details: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}