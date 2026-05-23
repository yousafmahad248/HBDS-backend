require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log("Testing email with user:", process.env.EMAIL_USER, "and pass:", process.env.EMAIL_PASS);
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // try without spaces next
      },
    });

    const mailOptions = {
        from: `"HBDS Admin" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // send to oneself
        subject: 'Test Email',
        text: 'This is a test email.',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: ", info.response);
  } catch (err) {
    console.error("Nodemailer Error: ", err);
  }
}

testEmail();
