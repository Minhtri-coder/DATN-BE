const petService = require('../services/petService');
const Pet = require('../models/Pet');
const { sendSuccess, sendError } = require('../utils/response');
const handleError = require('../utils/errorHandler');

// ==========================================
// CÁC HÀM TIỆN ÍCH (HELPERS)
// ==========================================

// Hàm tiện ích nội bộ: Tính Size tự động dựa trên Cân nặng
const calculateSizeByWeight = (weight) => {
    if (!weight || weight <= 0) return null;
    if (weight <= 5) return 'S';
    if (weight <= 15) return 'M';
    if (weight <= 30) return 'L';
    return 'XL';
};

// Hàm tiện ích: Chuyển chuỗi thành PascalCase (Ví dụ: "dOg" -> "Dog")
const toPascalCase = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Hàm tiện ích: Lọc và chuẩn hóa dữ liệu Pet đầu vào
const normalizePetData = (body) => {
    const weight = body.Weight ? Number(body.Weight) : undefined;
    let size = body.Size?.trim().toUpperCase();

    // 🚀 BUSINESS RULE BẮT BUỘC: 
    // Nếu có Cân nặng, hệ thống TỰ ĐỘNG quyết định Size, phớt lờ Size từ Client gửi lên.
    if (weight !== undefined && weight > 0) {
        size = calculateSizeByWeight(weight);
    }

    const data = {
        Name: body.Name?.trim(),
        Species: toPascalCase(body.Species?.trim()), // PascalCase
        Breed: body.Breed?.trim(),
        Size: size, // LUÔN UPPERCASE cho S, M, L, XL
        Weight: weight,
        Gender: toPascalCase(body.Gender?.trim()), // PascalCase
        Behavior: toPascalCase(body.Behavior?.trim()), // PascalCase
        SpecialNotes: body.SpecialNotes?.trim(),
        HealthStatus: toPascalCase(body.HealthStatus?.trim()), // PascalCase
        Status: toPascalCase(body.Status?.trim()) // ĐÃ SỬA: Thêm dòng này để nhận Status từ Client
    };

    // Lọc bỏ các key undefined để Mongoose không ghi đè mất data cũ
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    return data;
};

// Hàm tiện ích nội bộ của Controller: Check Enum và Validate dữ liệu
const validatePetData = (res, petData) => {
    if (petData.Size && !Pet.ENUMS.SIZES.includes(petData.Size)) {
        return "Kích thước không hợp lệ (Chỉ nhận S, M, L, XL).";
    }
    if (petData.Gender && !Pet.ENUMS.GENDERS.includes(petData.Gender)) {
        return "Giới tính không hợp lệ.";
    }
    if (petData.Species && !Pet.ENUMS.SPECIES.includes(petData.Species)) {
        return "Loài thú cưng không hợp lệ.";
    }
    if (petData.Behavior && !Pet.ENUMS.BEHAVIORS.includes(petData.Behavior)) {
        return "Tính cách/Hành vi không hợp lệ.";
    }
    if (petData.HealthStatus && !Pet.ENUMS.HEALTH_STATUSES.includes(petData.HealthStatus)) {
        return "Tình trạng sức khỏe không hợp lệ.";
    }
    // ĐÃ SỬA: Bổ sung validate cho Status
    if (petData.Status && !Pet.ENUMS.STATUS.includes(petData.Status)) {
        return "Trạng thái (Status) không hợp lệ.";
    }

    // Kiểm tra các trường chuỗi không được phép nhập toàn số
    const stringFields = {
        Name: 'Tên',
        Species: 'Loài',
        Breed: 'Giống',
        Behavior: 'Tính cách/Hành vi',
        SpecialNotes: 'Ghi chú đặc biệt',
        HealthStatus: 'Tình trạng sức khỏe'
    };

    for (const [key, label] of Object.entries(stringFields)) {
        if (petData[key] && /^\d+$/.test(petData[key])) {
            return `${label} không hợp lệ (không được phép chỉ nhập số).`;
        }
    }

    // Chặn Cân nặng âm, bằng 0, hoặc lớn hơn 200
    if (petData.Weight !== undefined) {
        if (isNaN(petData.Weight) || petData.Weight <= 0 || petData.Weight > 200) {
            return "Cân nặng phải lớn hơn 0 và tối đa 200 kg.";
        }
    }

    return null;
};

// ==========================================
// TẦNG CONTROLLER CHÍNH
// ==========================================

const petController = {
    // ------------------------------------------
    // TÁC VỤ PHÍA USER
    // ------------------------------------------
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
                PetID: result.pet._id
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
                return sendError(res, 400, "Vui lòng nhập đầy đủ các thông tin bắt buộc: Tên, Loài, và Kích thước/Cân nặng.");
            }

            const validationError = validatePetData(res, petData);
            if (validationError) return sendError(res, 400, validationError);

            const publishedPet = await petService.publishPetProcess(petId, userId, petData);
            return sendSuccess(res, 200, "Thêm thú cưng thành công", publishedPet);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getUserPets: async (req, res) => {
        try {
            const userId = req.user.userId;
            const page = Math.max(1, parseInt(req.query.page) || 1); // Bảo mật phân trang
            const limit = Math.min(parseInt(req.query.limit) || 10, 100);

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

            const validationError = validatePetData(res, petData);
            if (validationError) return sendError(res, 400, validationError);

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

    // ------------------------------------------
    // TÁC VỤ PHÍA ADMIN
    // ------------------------------------------
    getAdminPets: async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);

            const filters = {
                phone: req.query.phone?.trim(),
                status: toPascalCase(req.query.status?.trim()), // PascalCase
                name: req.query.name?.trim(),
                species: toPascalCase(req.query.species?.trim()), // PascalCase
                breed: req.query.breed?.trim(),
                size: req.query.size?.trim().toUpperCase(),
                gender: toPascalCase(req.query.gender?.trim()) // PascalCase
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

            const validationError = validatePetData(res, petData);
            if (validationError) return sendError(res, 400, validationError);

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

            const validationError = validatePetData(res, petData);
            if (validationError) return sendError(res, 400, validationError);

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