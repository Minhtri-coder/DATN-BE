const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware'); // Đảm bảo đường dẫn đúng

// ==========================================
// NHÓM API CHO USER (Chỉ cần đăng nhập)
// ==========================================
router.use('/user', authMiddleware);

router.get('/user', petController.getUserPets);
router.get('/user/:petId', petController.getUserPetDetail);
router.post('/user', petController.createUserPet);
router.put('/user/:petId', petController.updateUserPet);
router.delete('/user/:petId', petController.deleteUserPet);


// ==========================================
// NHÓM API CHO ADMIN (Role 2)
// Yêu cầu đăng nhập VÀ phải có quyền
// ==========================================
router.use('/admin', authMiddleware, authorizeRoles(2));

router.get('/admin', petController.getAdminPets);
router.get('/admin/:petId', petController.getAdminPetDetail);
router.post('/admin', petController.createAdminPet);
router.put('/admin/:petId', petController.updateAdminPet);
router.delete('/admin/:petId', petController.deleteAdminPet);

module.exports = router;