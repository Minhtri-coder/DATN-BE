const petService = require('../services/petService');
const Pet = require('../models/Pet'); // Import Model để lấy ENUMS
const { sendSuccess, sendError } = require('../utils/response');
const handleError = require('../utils/errorHandler'); // Import helper xử lý lỗi chung

// Hàm tiện ích: Lọc và chuẩn hóa dữ liệu Pet đầu vào
const normalizePetData = (body) => {
    const data = {
        Name: body.Name?.trim(),
        Species: body.Species?.trim(),
        Breed: body.Breed?.trim(),
        Size: body.Size?.trim().toUpperCase(), // Luôn viết hoa S, M, L, XL
        Weight: body.Weight ? Number(body.Weight) : undefined,
        Gender: body.Gender?.trim().toUpperCase(), // Luôn viết hoa để map chuẩn với Enum
        Temperament: body.Temperament?.trim(),
        SpecialNotes: body.SpecialNotes?.trim(),
        HealthStatus: body.HealthStatus?.trim()
    };

    // Lọc bỏ các key undefined để Mongoose không ghi đè mất data cũ
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    return data;
};

// Hàm tiện ích nội bộ của Controller: Check Enum
const validatePetEnums = (res, petData) => {
    if (petData.Size && !Pet.ENUMS.SIZES.includes(petData.Size)) {
        return "Kích thước không hợp lệ (Chỉ nhận S, M, L, XL).";
    }
    if (petData.Gender && !Pet.ENUMS.GENDERS.includes(petData.Gender)) {
        return "Giới tính không hợp lệ.";
    }
    return null;
};

const petController = {
    // ==========================================
    // TÁC VỤ PHÍA USER (DRAFT -> PUBLISH FLOW)
    // ==========================================

    initDraft: async (req, res) => {
        try {
            const userId = req.user.userId;
            const result = await petService.initDraftProcess(userId);

            return sendSuccess(res, 201, "Khởi tạo thú cưng nháp thành công", {
                ...result.pet,
                IsNewDraft: result.isNewDraft
            });
        } catch (error) {
            return handleError(res, error);
        }
    },

    resetDraft: async (req, res) => {
        try {
            const userId = req.user.userId;
            const result = await petService.resetDraftProcess(userId);

            return sendSuccess(res, 201, "Đặt lại thú cưng nháp thành công", {
                PetID: result.pet._id // SỬA: Lấy từ result.pet._id thay vì result.petId
            });
        } catch (error) {
            return handleError(res, error);
        }
    },

    publishPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;
            const petData = normalizePetData(req.body);

            if (!petData.Name || !petData.Species || !petData.Size) {
                return sendError(res, 400, "Vui lòng nhập đầy đủ các thông tin bắt buộc: Tên, Loài, và Kích thước.");
            }

            const enumError = validatePetEnums(res, petData);
            if (enumError) return sendError(res, 400, enumError);

            const publishedPet = await petService.publishPetProcess(petId, userId, petData);
            return sendSuccess(res, 200, "Thêm thú cưng thành công", publishedPet);
        } catch (error) {
            return handleError(res, error); // Catch gọn gàng, không chắp vá message
        }
    },

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
            return handleError(res, error);
        }
    },

    getUserPetDetail: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            const pet = await petService.getPetDetailProcess(petId, userId);
            return sendSuccess(res, 200, "Chi tiết thú cưng", pet);
        } catch (error) {
            return handleError(res, error);
        }
    },

    updateUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;
            const petData = normalizePetData(req.body);

            const enumError = validatePetEnums(res, petData);
            if (enumError) return sendError(res, 400, enumError);

            const updatedPet = await petService.updatePetProcess(petId, userId, petData);
            return sendSuccess(res, 200, "Cập nhật thông tin thành công", updatedPet);
        } catch (error) {
            return handleError(res, error);
        }
    },

    deleteUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            await petService.deletePetProcess(petId, userId);
            return sendSuccess(res, 200, "Đã xóa thú cưng khỏi danh sách.");
        } catch (error) {
            return handleError(res, error);
        }
    },

    // ==========================================
    // TÁC VỤ PHÍA ADMIN
    // ==========================================

    getAdminPets: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const filters = {
                phone: req.query.phone?.trim(),
                status: req.query.status?.trim().toUpperCase(),
                name: req.query.name?.trim(),
                species: req.query.species?.trim(),
                breed: req.query.breed?.trim(),
                size: req.query.size?.trim().toUpperCase(),
                gender: req.query.gender?.trim().toUpperCase()
            };

            const result = await petService.getAdminPetsProcess(page, limit, filters);
            return sendSuccess(res, 200, "Lấy dữ liệu thành công", result.pets, result.meta);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getAdminPetDetail: async (req, res) => {
        try {
            const { petId } = req.params;
            const pet = await petService.getPetDetailProcess(petId, null);
            return sendSuccess(res, 200, "Chi tiết thú cưng hệ thống", pet);
        } catch (error) {
            return handleError(res, error);
        }
    },

    createAdminPet: async (req, res) => {
        try {
            const Phone = req.body.Phone?.trim();
            const petData = normalizePetData(req.body);

            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!Phone || !phoneRegex.test(Phone) || !petData.Name || !petData.Species) {
                return sendError(res, 400, "Thông tin không hợp lệ. Vui lòng nhập đúng định dạng SĐT và đầy đủ Tên, Loài thú cưng.");
            }

            const enumError = validatePetEnums(res, petData);
            if (enumError) return sendError(res, 400, enumError);

            const newPet = await petService.createAdminPetProcess(Phone, petData);

            return sendSuccess(res, 201, `Đã tạo hồ sơ thú cưng cho khách hàng thành công.`, {
                PetID: newPet._id,
                UserID: newPet.UserID,
                Name: newPet.Name
            });
        } catch (error) {
            return handleError(res, error);
        }
    },

    updateAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            const petData = normalizePetData(req.body);

            const enumError = validatePetEnums(res, petData);
            if (enumError) return sendError(res, 400, enumError);

            await petService.updatePetProcess(petId, null, petData);
            return sendSuccess(res, 200, "Cập nhật hồ sơ thú cưng thành công.");
        } catch (error) {
            return handleError(res, error);
        }
    },

    deleteAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            await petService.deletePetProcess(petId, null);
            return sendSuccess(res, 200, "Đã xóa hồ sơ thú cưng thành công.");
        } catch (error) {
            return handleError(res, error);
        }
    }
};

module.exports = petController;