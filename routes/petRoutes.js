const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// IMPORT MIDDLEWARE BẮT LỖI PARAM
const { validateObjectIdParam } = require('../middlewares/validateParam');

// ==========================================
// NHÓM API CHO USER (Bắt buộc đăng nhập)
// ==========================================
router.use('/user', authMiddleware);

// Các API cho luồng DRAFT (Không có param :petId)
router.post('/user/drafts/init', petController.initDraft);
router.post('/user/drafts/reset', petController.resetDraft);
router.get('/user', petController.getUserPets);

// Các API CÓ param :petId (Bắt buộc phải đi qua validateObjectIdParam)
router.post('/user/:petId/publish', validateObjectIdParam('petId'), petController.publishPet);
router.get('/user/:petId', validateObjectIdParam('petId'), petController.getUserPetDetail);
router.put('/user/:petId', validateObjectIdParam('petId'), petController.updateUserPet);
router.delete('/user/:petId', validateObjectIdParam('petId'), petController.deleteUserPet);


// ==========================================
// NHÓM API CHO ADMIN / EMPLOYEE (Role 1, 2)
// ==========================================
router.use('/admin', authMiddleware, authorizeRoles(1, 2));

// Các API không có param :petId
router.get('/admin', petController.getAdminPets);
router.post('/admin', petController.createAdminPet);

// Các API CÓ param :petId (Bắt buộc phải đi qua validateObjectIdParam)
router.get('/admin/:petId', validateObjectIdParam('petId'), petController.getAdminPetDetail);
router.put('/admin/:petId', validateObjectIdParam('petId'), petController.updateAdminPet);
router.delete('/admin/:petId', validateObjectIdParam('petId'), petController.deleteAdminPet);

module.exports = router;