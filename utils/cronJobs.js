const cron = require('node-cron');
const BloodRequest = require('../models/BloodRequest');
const { escalateToDonors } = require('../controllers/requestController');

const startCronJobs = () => {
    // Run every 15 minutes to check for requests that have been pending > 2 hours
    cron.schedule('*/15 * * * *', async () => {
        try {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

            const pendingRequests = await BloodRequest.find({
                targetAudience: 'Hospitals',
                status: 'Open',
                createdAt: { $lte: twoHoursAgo }
            });

            for (const request of pendingRequests) {
                request.targetAudience = 'Donors';
                await request.save();
                
                // Fire off the donor calculation and emails
                await escalateToDonors(request);
                console.log(`Cron escalated request ${request._id} to donors due to 2 hour timeout.`);
            }
        } catch (error) {
            console.error('Cron Job Error:', error);
        }
    });
};

module.exports = startCronJobs;
