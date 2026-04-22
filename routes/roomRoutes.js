const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');



// Gắn Middleware xác thực & phân quyền cho TẤT CẢ API của Admin tại đây
router.use("/admin", authMiddleware, authorizeRoles(2));

// ==========================================
// THAO TÁC VỚI PHÒNG (ROOM)
// ==========================================

// Lấy danh sách phòng
router.get('/admin', roomController.getRooms);

// Lấy chi tiết phòng (kèm theo tổng số chuồng bên trong)
router.get('/admin/:roomId', roomController.getRoomDetail);

// Tạo phòng mới
router.post('/admin', roomController.createRoom);

// Sửa phòng
router.put('/admin/:roomId', roomController.updateRoom);

// Ẩn phòng (Chỉ ẩn khi không còn chuồng nào active)
router.delete('/admin/:roomId', roomController.deleteRoom);


// ==========================================
// THAO TÁC VỚI CHUỒNG (BOX)
// ==========================================

// Thêm chuồng hàng loạt vào phòng
router.post('/admin/rooms/:roomId/boxes/bulk', roomController.addBoxesBulk);

// Lấy danh sách chuồng thuộc phòng
router.get('/admin/rooms/:roomId/boxes', roomController.getBoxesByRoom);

// Thêm 1 chuồng vào phòng cụ thể
router.post('/admin/rooms/:roomId/boxes', roomController.addSingleBox);

// Lấy chi tiết 1 chuồng
router.get('/admin/boxes/:boxId', roomController.getBoxDetail);

// Chỉnh sửa thông tin 1 chuồng
router.put('/admin/boxes/:boxId', roomController.updateBox);

// Ẩn 1 chuồng (Chỉ được phép khi status đang là Available)
router.delete('/admin/boxes/:boxId', roomController.deleteBox);

module.exports = router;