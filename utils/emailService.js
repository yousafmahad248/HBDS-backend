const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If email credentials are not set in .env, just log the email to the console 
  // so development and testing can continue without a real email account.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n======================================================');
    console.log('⚠️ SIMULATED EMAIL (No credentials found in .env) ⚠️');
    console.log('======================================================');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.message}`);
    console.log('======================================================\n');
    return Promise.resolve(); // Simulate successful sending
  }

  // Use explicit host/port settings for better compatibility
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true
  });

  const mailOptions = {
    from: `"HBDS Admin" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`NODEMAILER ERROR for ${options.email}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
