const Notification = require('../models/Notification');

// Get all notifications for the logged-in user/hospital
exports.getNotifications = async (req, res) => {
  try {
    // req.user should contain the id and role (User or Hospital) from the auth middleware
    const recipientId = req.user.id;
    const recipientModel = req.user.role === 'hospital' ? 'Hospital' : 'User';

    const notifications = await Notification.find({ 
      recipient: recipientId,
      recipientModel: recipientModel 
    }).sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify ownership
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const recipientId = req.user.id;
    const recipientModel = req.user.role === 'hospital' ? 'Hospital' : 'User';

    await Notification.updateMany(
      { recipient: recipientId, recipientModel: recipientModel, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Internal helper function to create a notification
// This will be called from other controllers (e.g. requestController)
exports.createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();

    // Emit real-time notification if socket io is available
    if (global.io) {
      global.io.to(data.recipient.toString()).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating internal notification:', error);
  }
};
