// src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();

// Import Controller
const uploadController = require('../controllers/uploadController');

// Import Middlewares cốt lõi
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload'); // Trạm cấu hình 3MB, file ảnh
const multerErrorHandler = require('../middlewares/multerErrorHandler'); // Trạm bắt lỗi


// [POST] /upload
// LUỒNG DỮ LIỆU ĐI QUA 4 TRẠM:
// Trạm 1: authMiddleware -> Kiểm tra token, chặn nếu khách chưa đăng nhập.
// Trạm 2: upload.any() -> Hứng mọi file đẩy lên, kiểm tra 3MB và đuôi ảnh.
// Trạm 3: multerErrorHandler -> Nếu Trạm 2 báo lỗi, trạm này trả ngay về mã 400/413.
// Trạm 4: uploadController -> Phân quyền RBAC, IDOR, giao Service đẩy lên Cloudinary.
router.post(
    '/',
    authMiddleware,
    upload.any(),
    multerErrorHandler,
    uploadController.uploadMedia
);

module.exports = router;