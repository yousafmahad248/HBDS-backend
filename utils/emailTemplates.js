const getWelcomeTemplate = (name, role) => {
    const isHospital = role === 'hospital';
    const welcomeMessage = isHospital 
        ? `Thank you for registering your hospital, <strong>${name}</strong>. You can now start posting blood requests and managing donations.`
        : `Welcome to the community, <strong>${name}</strong>. Your contribution as a donor can save lives. You can now view and accept blood requests nearby.`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 20px; }
            .footer { text-align: center; font-size: 0.8em; color: #777; margin-top: 20px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HBDS - Blood Donation App</h1>
            </div>
            <div class="content">
                <h2>Welcome aboard!</h2>
                <p>Hello ${name},</p>
                <p>${welcomeMessage}</p>
                <p>Together, we can bridge the gap between donors and those in need.</p>
                <a href="#" class="button">Get Started</a>
            </div>
            <div class="footer">
                <p>&copy; 2026 Hospital & Blood Donation System (HBDS). All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = {
    getWelcomeTemplate
};
