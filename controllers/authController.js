const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');
const handleError = require('../utils/errorHandler');

// Hàm chuẩn hóa SĐT dùng chung cho toàn bộ Controller
const formatPhone = (phone) => {
    if (!phone || typeof phone !== "string") {
        throw new Error("BAD_REQUEST: Số điện thoại không hợp lệ.");
    }

    let normalized = phone.trim();

    // Chuyển đổi mã vùng +84 -> 0
    if (normalized.startsWith("+84")) {
        normalized = "0" + normalized.slice(3);
    }

    // Validate Regex SĐT Việt Nam: Bắt đầu bằng 0, tổng cộng 10 số
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(normalized)) {
        throw new Error("BAD_REQUEST: Số điện thoại không hợp lệ.");
    }

    return normalized;
};

const authController = {

    // [POST] /auth/send-otp
    sendOtp: async (req, res) => {
        try {
            const normalizedPhone = formatPhone(req.body.Phone);
            await authService.sendOtpProcess(normalizedPhone);

            return sendSuccess(res, 200, "Đã gửi mã OTP thành công.", { test_otp: "1234" });
        } catch (error) {
            return handleError(res, error);
        }
    },

    // [POST] /auth/admin/send-otp
    sendAdminOtp: async (req, res) => {
        try {
            const normalizedPhone = formatPhone(req.body.Phone);
            await authService.sendAdminOtpProcess(normalizedPhone);

            return sendSuccess(res, 200, "Đã gửi mã OTP thành công.", { test_otp: "1234" });
        } catch (error) {
            return handleError(res, error);
        }
    },

    // [POST] /auth/verify-otp
    verifyOtp: async (req, res) => {
        try {
            const normalizedPhone = formatPhone(req.body.Phone);
            const { OTP } = req.body;

            const result = await authService.verifyOtpProcess(normalizedPhone, OTP);

            if (result.is_new_user) {
                return sendSuccess(res, 200, "Số điện thoại mới, vui lòng cập nhật thông tin", result);
            } else {
                return sendSuccess(res, 200, "Đăng nhập thành công", result);
            }
        } catch (error) {
            return handleError(res, error);
        }
    },

    // [POST] /auth/register
    register: async (req, res) => {
        try {
            const { register_token, Name, Email, Address } = req.body;

            // Validate căn bản tại Controller
            if (!Name || !Email) {
                return sendError(res, 400, "Tên và Email là thông tin bắt buộc.");
            }

            // Chuẩn hóa chuỗi Email trước khi lưu
            const normalizedEmail = Email.trim().toLowerCase();

            const result = await authService.registerProcess(register_token, Name, normalizedEmail, Address);

            return sendSuccess(res, 201, "Đăng ký thành công", result);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // [POST] /auth/refresh
    refreshToken: async (req, res) => {
        try {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                return sendError(res, 400, "Vui lòng cung cấp refresh token.");
            }

            const result = await authService.refreshTokenProcess(refresh_token);
            return sendSuccess(res, 200, "Làm mới phiên đăng nhập thành công", result);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // [POST] /auth/logout
    logout: async (req, res) => {
        try {
            // req.user được gắn từ authMiddleware
            await authService.logoutProcess(req.user.userId);
            return sendSuccess(res, 200, "Đăng xuất thành công.");
        } catch (error) {
            return handleError(res, error);
        }
    }
};

module.exports = authController;