const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// API Gửi OTP theo SĐT
router.post('/send-otp', authController.sendOtp);

// API Xác thực OTP theo SĐT
router.post('/verify-otp', authController.verifyOtp);

// API Đăng ký tài khoản mới (sau khi xác thực OTP thành công)
router.post('/register', authController.register);

router.post('/refresh', authController.refreshToken);

router.post('/logout', authMiddleware, authController.logout);
module.exports = router;