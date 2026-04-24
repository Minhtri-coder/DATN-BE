const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Import middleware validate (Bạn nhớ sửa lại đường dẫn cho khớp với cấu trúc thư mục của bạn nhé)
const { validateObjectIdParam } = require('../middlewares/validateParam');

// ==========================================
// THAO TÁC VỚI NGƯỜI DÙNG (DÀNH CHO ADMIN)
// ==========================================

// Gắn Middleware xác thực & phân quyền Admin (Role = 2) cho toàn bộ sub-route /admin
router.use("/", authMiddleware, authorizeRoles(2));

// [GET] Lấy danh sách tài khoản (có phân trang, search, filter theo role)
// Tuyến này không có params ID nên không cần gắn middleware
router.get('/', userController.getUsers);


// [GET] Kiểm tra sự tồn tại của SĐT (Dùng cho form tạo Pet/Booking)
router.get('/check-phone', userController.checkPhone);

// [GET] Lấy chi tiết tài khoản
router.get(
    '/:userId',
    validateObjectIdParam('userId'),
    userController.getUserDetail
);

// [PUT] Cập nhật thông tin tài khoản (Name, Address, Role...)
router.put(
    '/:userId',
    validateObjectIdParam('userId'),
    userController.updateUser
);

// [PATCH] Khóa/Mở tài khoản
router.patch(
    '/:userId',
    validateObjectIdParam('userId'),
    userController.toggleUserStatus
);

module.exports = router;