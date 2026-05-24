const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If API key is not set, simulate the email
  if (!process.env.BREVO_API_KEY) {
    console.log('\n======================================================');
    console.log('⚠️ SIMULATED EMAIL (No BREVO_API_KEY found in .env) ⚠️');
    console.log('======================================================');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.message}`);
    console.log('======================================================\n');
    return Promise.resolve(); // Simulate successful sending
  }

  // Use Brevo (Sendinblue) HTTP API to bypass Render's SMTP blocks
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          email: process.env.EMAIL_USER || 'mahadyousaf514@gmail.com', 
          name: 'HBDS Admin' 
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.message
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('BREVO API ERROR:', errorData);
      throw new Error(`Brevo API Error: ${errorData.message}`);
    }

    const data = await response.json();
    console.log(`Email sent successfully via Brevo to ${options.email}: ${data.messageId}`);
    return data;
  } catch (error) {
    console.error(`EMAIL SEND ERROR for ${options.email}:`, error);
    throw error;
  }
};

module.exports = sendEmail;
