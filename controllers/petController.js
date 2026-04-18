const petService = require('../services/petService');
const { sendSuccess, sendError } = require('../utils/response');

const petController = {
    // ==========================================
    // TÁC VỤ PHÍA USER (DRAFT -> PUBLISH FLOW)
    // ==========================================

    // 1. Khởi tạo Draft (Chỉ có 1 bản nháp duy nhất)
    initDraft: async (req, res) => {
        try {
            const userId = req.user.userId;

            const result = await petService.initDraftProcess(userId);

            return sendSuccess(res, 201, "Khởi tạo thú cưng nháp thành công", {
                ...result.pet,       // Trả về toàn bộ Name, Species, Breed, Image, v.v...
                IsNewDraft: result.isNewDraft
            });
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống khi khởi tạo bản nháp");
        }
    },

    // 2. Reset Draft (Xóa bản nháp cũ, tạo bản nháp mới)
    resetDraft: async (req, res) => {
        try {
            const userId = req.user.userId;

            // Service sẽ Hard Delete pet có status DRAFT của user này, và tạo mới
            const result = await petService.resetDraftProcess(userId);

            return sendSuccess(res, 201, "Reset thú cưng nháp thành công", {
                PetID: result.petId
            });
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống khi reset bản nháp");
        }
    },

    // 3. Publish (Chính thức tạo pet từ bản nháp)
    publishPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;
            const { Name, Species, Size } = req.body;

            // Validate khắt khe khi publish
            if (!Name || !Species || !Size) {
                return sendError(res, 400, "Vui lòng nhập đầy đủ các thông tin bắt buộc: Tên, Loài, và Kích thước.");
            }

            // Service sẽ update thông tin vào petId này và chuyển Status -> 'ACTIVE'
            const publishedPet = await petService.publishPetProcess(petId, userId, req.body);

            return sendSuccess(res, 200, "Thêm thú cưng thành công", publishedPet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không tìm thấy bản nháp hợp lệ để xuất bản.");
            }
            return sendError(res, 500, "Lỗi hệ thống khi xuất bản thú cưng");
        }
    },

    // 4. Lấy danh sách Pet đã tạo
    getUserPets: async (req, res) => {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            // Chú ý: Service cần query với điều kiện { UserID: userId, Status: 'ACTIVE' }
            const result = await petService.getUserPetsProcess(userId, page, limit);

            return sendSuccess(res, 200, "Lấy danh sách thú cưng thành công", result.pets, {
                has_next_page: result.hasNextPage
            });
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // 5. Lấy chi tiết Pet
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

    // 6. Cập nhật Pet (Không xử lý file ảnh ở đây)
    updateUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            const updatedPet = await petService.updatePetProcess(petId, userId, req.body);
            return sendSuccess(res, 200, "Cập nhật thông tin thành công", updatedPet);
        } catch (error) {
            if (error.message === "Not Found") {
                return sendError(res, 404, "Không thể cập nhật. Thú cưng không tồn tại.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // 7. Xóa Pet (Nên là Soft Delete)
    deleteUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            // Service: FindByIdAndUpdate(petId, { Status: 'DELETED' })
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

    // ==========================================
    // TÁC VỤ PHÍA ADMIN
    // ==========================================

    getAdminPets: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const phone = req.query.phone;
            const status = req.query.status; // Hỗ trợ chuỗi "DRAFT,ACTIVE,DELETED"

            const result = await petService.getAdminPetsProcess(page, limit, phone, status);
            return sendSuccess(res, 200, "Lấy dữ liệu thành công", result.pets, result.meta);
        } catch (error) {
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    getAdminPetDetail: async (req, res) => {
        try {
            const { petId } = req.params;
            // Admin gọi nên truyền userId = null
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
            // ĐÃ BỎ: Không còn nhận req.file ở đây nữa

            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!Phone || !phoneRegex.test(Phone) || !Name || !Species) {
                return sendError(res, 400, "Thông tin không hợp lệ. Vui lòng nhập đúng định dạng SĐT và đầy đủ thông tin thú cưng.");
            }

            const newPet = await petService.createAdminPetProcess(Phone, req.body);

            // Trả về theo chuẩn ảnh số 3 (API 18)
            return sendSuccess(res, 201, `Đã tạo hồ sơ thú cưng cho khách hàng có SĐT ${Phone} thành công.`, {
                PetID: newPet._id,
                UserID: newPet.UserID,
                Name: newPet.Name
            });
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
            // ĐÃ BỎ: Không còn nhận req.file ở đây nữa

            await petService.updatePetProcess(petId, null, req.body);
            return sendSuccess(res, 200, "Cập nhật hồ sơ thú cưng thành công.");
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