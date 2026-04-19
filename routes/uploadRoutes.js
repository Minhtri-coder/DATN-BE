// src/routes/uploadRoutes.js (giả định file nằm trong folder routes)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/optionalAuth');

// Import hàm sendError từ file response utils của bạn
const { sendError } = require('../utils/response');

const storage = multer.memoryStorage();

// Cấu hình Multer an toàn hơn
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 30 * 1024 * 1024, // Giới hạn 30MB cho cả ảnh và video
    },
    fileFilter: (req, file, cb) => {
        // Chỉ cho phép ảnh và các định dạng video cơ bản
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Định dạng file không được hỗ trợ! Chỉ chấp nhận Ảnh hoặc Video.'));
        }
    }
});

// Bắt lỗi multer (ví dụ lỗi vượt quá 50MB)
const uploadMiddleware = (req, res, next) => {
    const uploadFunc = upload.array('files', 10);
    uploadFunc(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Lỗi do cấu hình multer (vd: file quá lớn, vượt quá số lượng 10 file)
            // Thay thế res.status() bằng sendError
            return sendError(res, 400, "Lỗi tải lên: " + err.message);
        } else if (err) {
            // Lỗi do fileFilter ném ra (sai định dạng)
            // Thay thế res.status() bằng sendError
            return sendError(res, 400, err.message);
        }

        // Mọi thứ OK, cho đi tiếp vào uploadController
        next();
    });
};

router.post('/', authMiddleware, uploadMiddleware, uploadController.uploadMedia);

module.exports = router;