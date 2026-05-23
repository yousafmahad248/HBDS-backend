require('dotenv').config();
const sendEmail = require('./utils/emailService');
const { getWelcomeTemplate } = require('./utils/emailTemplates');

async function verifyTemplates() {
    console.log("Verifying templates for user:", process.env.EMAIL_USER);
    try {
        const name = "Test User";
        const role = "donor";
        
        await sendEmail({
            email: process.env.EMAIL_USER,
            subject: 'Template Verification',
            message: `Hello ${name}, this is a template verification.`,
            html: getWelcomeTemplate(name, role)
        });
        
        console.log("Template email sent successfully!");
    } catch (err) {
        console.error("Verification Error: ", err);
    }
}

verifyTemplates();
