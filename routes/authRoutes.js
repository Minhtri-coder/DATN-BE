const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// API Gửi OTP theo SĐT (Dành cho User thông thường)
router.post('/send-otp', authController.sendOtp);

// API Gửi OTP dành cho Admin/Employee (Chỉ gửi nếu SĐT có Role >= 1)
router.post('/admin/send-otp', authController.sendAdminOtp);

// API Xác thực OTP theo SĐT
router.post('/verify-otp', authController.verifyOtp);

// API Đăng ký tài khoản mới (sau khi xác thực OTP thành công)
router.post('/register', authController.register);

router.post('/refresh', authController.refreshToken);

router.post('/logout', authMiddleware, authController.logout);
module.exports = router;