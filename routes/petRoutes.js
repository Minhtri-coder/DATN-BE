const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const authMiddleware = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// ==========================================
// NHÓM API CHO USER
// ==========================================
router.use('/user', authMiddleware);

router.get('/user', petController.getUserPets);
router.get('/user/:petId', petController.getUserPetDetail);

// KHÔNG CÒN upload.single() NỮA
router.post('/user', petController.createUserPet);
router.put('/user/:petId', petController.updateUserPet);
router.delete('/user/:petId', petController.deleteUserPet);


// ==========================================
// NHÓM API CHO ADMIN / EMPLOYEE (Role 1, 2)
// ==========================================
router.use('/admin', authMiddleware, authorizeRoles(1, 2));

router.get('/admin', petController.getAdminPets);
router.get('/admin/:petId', petController.getAdminPetDetail);

// KHÔNG CÒN upload.single() NỮA
router.post('/admin', petController.createAdminPet);
router.put('/admin/:petId', petController.updateAdminPet);
router.delete('/admin/:petId', petController.deleteAdminPet);

module.exports = router;