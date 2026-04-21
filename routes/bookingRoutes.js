const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /booking/available - API Lọc phòng trống (Public cho mọi người hoặc AI Agent xem trước)
router.get('/available', bookingController.getAvailableRooms);

// Bắt buộc đăng nhập cho các API bên dưới
router.use(authMiddleware);

// POST /booking/ - API Tạo đơn đặt phòng
router.post('/', bookingController.createBooking);

// GET /booking/history - API Lấy danh sách lịch sử đặt phòng
router.get('/history', bookingController.getBookingHistory);

// PUT /booking/:bookingId/cancel - API Hủy đơn
router.put('/:bookingId/cancel', bookingController.cancelBooking);

module.exports = router;
