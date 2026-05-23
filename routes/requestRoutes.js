const express = require('express');
const router = express.Router();
const { createRequest, getAllRequests, getMyRequests, acceptRequest, declineRequest, updateRequest, deleteRequest } = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createRequest);
router.get('/my-requests', protect, getMyRequests);
router.get('/', protect, getAllRequests);
router.put('/:id', protect, updateRequest);
router.delete('/:id', protect, deleteRequest);
router.post('/:id/accept', protect, acceptRequest);
router.post('/:id/decline', protect, declineRequest);

module.exports = router;
