const userService = require('../services/userService');
const { sendSuccess } = require('../utils/response');
const handleError = require('../utils/errorHandler');

const userController = {
    // 1. LẤY DANH SÁCH NGƯỜI DÙNG
    getUsers: async (req, res) => {
        try {
            // Phòng thủ phân trang: Ép kiểu, chặn số âm, chặn lấy quá 100 item/lần
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);

            const filters = {
                search: req.query.search?.trim(),
                role: req.query.role?.trim(),
                isActive: req.query.isActive?.trim() // Dùng cho bộ lọc "Tất cả / Đang hoạt động / Bị khóa"
            };

            const data = await userService.getUsersProcess(page, limit, filters);
            return sendSuccess(res, 200, "Lấy danh sách người dùng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // 2. LẤY CHI TIẾT 1 NGƯỜI DÙNG
    getUserDetail: async (req, res) => {
        try {
            const { userId } = req.params;
            const data = await userService.getUserDetailProcess(userId);
            return sendSuccess(res, 200, "Lấy chi tiết người dùng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // 3. CẬP NHẬT THÔNG TIN NGƯỜI DÙNG
    updateUser: async (req, res) => {
        try {
            const { userId } = req.params;
            let { Name, Address, Role } = req.body;

            // Chuẩn hóa data
            const updateData = {
                Name: Name?.trim(),
                Address: Address?.trim(),
                Role: Role !== undefined ? Number(Role) : undefined
            };

            // Dọn dẹp các key undefined trước khi ném xuống Service (Nguyên tắc Controller)
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            const data = await userService.updateUserProcess(userId, updateData);
            return sendSuccess(res, 200, "Cập nhật thông tin tài khoản thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // 4. KHÓA / MỞ KHÓA TÀI KHOẢN (TOGGLE STATUS)
    toggleUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;

            // Lấy trạng thái từ body (Ví dụ: { isActive: false })
            const isActive = req.body.isActive;

            if (isActive === undefined || typeof isActive !== 'boolean') {
                throw new Error("BAD_REQUEST: Trạng thái isActive (boolean) là bắt buộc.");
            }

            const result = await userService.toggleUserStatusProcess(userId, isActive);
            const message = isActive ? "Đã MỞ KHÓA tài khoản thành công." : "Đã KHÓA tài khoản thành công.";

            return sendSuccess(res, 200, message, result);
        } catch (error) {
            return handleError(res, error);
        }
    },

    checkPhone: async (req, res) => {
        try {
            let { phone } = req.query;

            if (!phone) {
                // Sử dụng sendError thay vì ném lỗi vì đây là lỗi do Client truyền thiếu query
                throw new Error("BAD_REQUEST: Vui lòng cung cấp số điện thoại cần kiểm tra.");
            }

            // Chuẩn hóa SĐT cơ bản (Trim và đổi +84 thành 0)
            phone = phone.trim();
            if (phone.startsWith("+84")) {
                phone = "0" + phone.slice(3);
            }

            const data = await userService.checkPhoneProcess(phone);

            return sendSuccess(res, 200, "Tìm thấy thông tin khách hàng.", data);
        } catch (error) {
            return handleError(res, error);
        }
    }
};

module.exports = userController;