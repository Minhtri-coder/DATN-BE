const petService = require('../services/petService');

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

            return res.status(200).json({
                status: true,
                message: "Lấy danh sách thú cưng thành công",
                data: result.pets,
                meta: { has_next_page: result.hasNextPage }
            });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    getUserPetDetail: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            const pet = await petService.getPetDetailProcess(petId, userId);

            return res.status(200).json({
                status: true,
                message: "Chi tiết thú cưng",
                data: pet
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Không tìm thấy thú cưng này hoặc bạn không có quyền xem." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    createUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { Name, Species, Size } = req.body;

            // Validate các trường bắt buộc
            if (!Name || !Species || !Size) {
                return res.status(400).json({ status: false, message: "Vui lòng nhập đầy đủ: Tên, Loài, Giống và Kích thước." });
            }

            const newPet = await petService.createPetProcess(userId, req.body);

            return res.status(201).json({
                status: true,
                message: "Thêm thú cưng thành công",
                data: newPet
            });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    updateUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            const updatedPet = await petService.updatePetProcess(petId, userId, req.body);

            return res.status(200).json({
                status: true,
                message: "Cập nhật thông tin thành công",
                data: updatedPet
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Không thể cập nhật. Thú cưng không tồn tại." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    deleteUserPet: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { petId } = req.params;

            await petService.deletePetProcess(petId, userId);

            return res.status(200).json({
                status: true,
                message: "Đã xóa thú cưng khỏi danh sách."
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Không tìm thấy thú cưng để xóa." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    // ==========================================
    // TÁC VỤ PHÍA ADMIN
    // ==========================================

    getAdminPets: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const phone = req.query.phone; // Lọc theo số điện thoại chủ

            const result = await petService.getAdminPetsProcess(page, limit, phone);

            return res.status(200).json({
                status: true,
                message: "Lấy dữ liệu thành công",
                data: result.pets,
                meta: result.meta
            });
        } catch (error) {
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    getAdminPetDetail: async (req, res) => {
        try {
            const { petId } = req.params;
            const pet = await petService.getPetDetailProcess(petId, null); // admin không cần kiểm tra userId

            return res.status(200).json({
                status: true,
                message: "Chi tiết thú cưng hệ thống",
                data: pet
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Thú cưng không tồn tại trong hệ thống." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    createAdminPet: async (req, res) => {
        try {
            const { Phone, Name, Species, Size } = req.body;

            // Kiểm tra format SĐT
            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!Phone || !phoneRegex.test(Phone) || !Name || !Species) {
                return res.status(400).json({ status: false, message: "Thông tin không hợp lệ. Vui lòng nhập đúng định dạng SĐT và đầy đủ thông tin thú cưng." });
            }

            const newPet = await petService.createAdminPetProcess(Phone, req.body);

            return res.status(201).json({
                status: true,
                message: `Đã tạo hồ sơ thú cưng cho khách hàng có SĐT ${Phone} thành công.`,
                data: newPet
            });
        } catch (error) {
            if (error.message === "User Not Found") {
                return res.status(404).json({ status: false, message: "Không tìm thấy khách hàng với số điện thoại này. Vui lòng kiểm tra lại hoặc tạo tài khoản mới cho khách." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    updateAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            const updatedPet = await petService.updatePetProcess(petId, null, req.body); // Admin không xét chủ sở hữu

            return res.status(200).json({
                status: true,
                message: "Cập nhật hồ sơ thú cưng thành công.",
                data: updatedPet
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Không tìm thấy hồ sơ để cập nhật." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    deleteAdminPet: async (req, res) => {
        try {
            const { petId } = req.params;
            await petService.deletePetProcess(petId, null); // Xoá dưới quyền Admin

            return res.status(200).json({
                status: true,
                message: "Đã xóa hồ sơ thú cưng thành công."
            });
        } catch (error) {
            if (error.message === "Not Found") {
                return res.status(404).json({ status: false, message: "Không tìm thấy thú cưng để xóa." });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    }
};

module.exports = petController;