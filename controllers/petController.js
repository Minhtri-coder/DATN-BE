const petService = require('../services/petService');
const { sendSuccess, sendError } = require('../utils/response');

const petController = {
    // ==========================================
    // TÁC VỤ PHÍA USER
    // ==========================================

    getUserPets: async (req, res) => {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await petService.getUserPetsProcess(userId, page, limit);

            return sendSuccess(res, 200, "Lấy danh sách thú cưng thành công", result.pets, {
                has_next_page: result.hasNextPage
            });
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    getUserPetDetail: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            const pet = await petService.getPetDetailProcess(petId, userId);
            return sendSuccess(res, 200, "Chi tiết thú cưng", pet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không tìm thấy thú cưng này hoặc bạn không có quyền xem.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    createUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { Name, Species, Size } = req.body;
            const file = req.file;

            if (!Name || !Species || !Size) {
                return sendError(res, 400, "Vui lòng nhập đầy đủ: Tên, Loài, Giống và Kích thước.");
            }

            const newPet = await petService.createPetProcess(userId, req.body, file);
            return sendSuccess(res, 201, "Thêm thú cưng thành công", newPet);
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    updateUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;
            const file = req.file;

            const updatedPet = await petService.updatePetProcess(petId, userId, req.body, file);
            return sendSuccess(res, 200, "Cập nhật thông tin thành công", updatedPet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không thể cập nhật. Thú cưng không tồn tại.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    deleteUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            await petService.deletePetProcess(petId, userId);
            return sendSuccess(res, 200, "Đã xóa thú cưng khỏi danh sách.");
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không tìm thấy thú cưng để xóa.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // ==========================================
    // TÁC VỤ PHÍA ADMIN
    // ==========================================

    getAdminPets: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const phone = req.query.phone;

            const result = await petService.getAdminPetsProcess(page, limit, phone);
            return sendSuccess(res, 200, "Lấy dữ liệu thành công", result.pets, result.meta);
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    getAdminPetDetail: async (req, res) => {
        try {
            const { petId } = req.params;
            const pet = await petService.getPetDetailProcess(petId, null);
            return sendSuccess(res, 200, "Chi tiết thú cưng hệ thống", pet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Thú cưng không tồn tại trong hệ thống.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    createAdminPet: async (req, res) => {
        try {
            const { Phone, Name, Species } = req.body;
            const file = req.file;

            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!Phone || !phoneRegex.test(Phone) || !Name || !Species) {
                return sendError(res, 400, "Thông tin không hợp lệ. Vui lòng nhập đúng định dạng SĐT và đầy đủ thông tin thú cưng.");
            }

            const newPet = await petService.createAdminPetProcess(Phone, req.body, file);
            return sendSuccess(res, 201, `Đã tạo hồ sơ thú cưng cho khách hàng có SĐT ${Phone} thành công.`, newPet);
        } catch (error) {
            if (error.message === "User Not Found") {
                return sendError(res, 404, "Không tìm thấy khách hàng với số điện thoại này. Vui lòng kiểm tra lại hoặc tạo tài khoản mới cho khách.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    updateAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            const file = req.file;

            const updatedPet = await petService.updatePetProcess(petId, null, req.body, file);
            return sendSuccess(res, 200, "Cập nhật hồ sơ thú cưng thành công.", updatedPet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không tìm thấy hồ sơ để cập nhật.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    deleteAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            await petService.deletePetProcess(petId, null);
            return sendSuccess(res, 200, "Đã xóa hồ sơ thú cưng thành công.");
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không tìm thấy thú cưng để xóa.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    }
};

module.exports = petController;