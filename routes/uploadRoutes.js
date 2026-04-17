const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middlewares/upload'); // File cấu hình multer của bạn
const multerErrorHandler = require('../middlewares/multerErrorHandler');
const authMiddleware = require('../middlewares/authMiddleware');

// Chỉ những người đã đăng nhập mới được phép upload ảnh (tránh rác server)
router.post('/image', authMiddleware, upload.single('file'), multerErrorHandler, uploadController.uploadImage);

module.exports = router;