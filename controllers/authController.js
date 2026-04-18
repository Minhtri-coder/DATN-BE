const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');

// Hàm chuẩn hóa SĐT dùng chung cho toàn bộ Controller
const formatPhone = (phone) => {
    if (!phone || typeof phone !== "string") {
        throw new Error("SĐT không hợp lệ.");
    }

    let normalized = phone.trim();

    // Chuyển đổi mã vùng +84 -> 0
    if (normalized.startsWith("+84")) {
        normalized = "0" + normalized.slice(3);
    }

    // Validate Regex SĐT Việt Nam: Bắt đầu bằng 0, tổng cộng 10 số
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(normalized)) {
        throw new Error("SĐT không hợp lệ.");
    }

    return normalized;
};

const authController = {

    // [POST] /auth/send-otp
    sendOtp: async (req, res) => {
        try {
            // Ép về số 0 ngay lập tức
            const normalizedPhone = formatPhone(req.body.Phone);

            await authService.sendOtpProcess(normalizedPhone);

            return sendSuccess(res, 200, "Đã gửi mã OTP thành công.", { test_otp: "1234" });
        } catch (error) {
            return sendError(res, 400, error.message || "Lỗi hệ thống...");
        }
    },

    // [POST] /auth/verify-otp
    verifyOtp: async (req, res) => {
        try {
            // Ép về số 0 ngay lập tức
            const normalizedPhone = formatPhone(req.body.Phone);
            const { OTP } = req.body;

            const result = await authService.verifyOtpProcess(normalizedPhone, OTP);

            if (result.is_new_user) {
                return sendSuccess(res, 200, "Số điện thoại mới, vui lòng cập nhật thông tin", {
                    is_new_user: true,
                    register_token: result.register_token
                });
            } else {
                return sendSuccess(res, 200, "Đăng nhập thành công", {
                    is_new_user: false,
                    access_token: result.access_token,
                    refresh_token: result.refresh_token,
                    user: result.user
                });
            }
        } catch (error) {
            if (
                error.message === "Mã OTP không chính xác." ||
                error.message === "Mã OTP đã hết hạn." ||
                error.message === "SĐT không hợp lệ."
            ) {
                return sendError(res, 400, error.message);
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // [POST] /auth/register
    register: async (req, res) => {
        try {
            const { register_token, Name, Email, Address } = req.body;

            // API Register BẮT BUỘC phải có Email
            if (!Name || !Email) {
                return sendError(res, 400, "Tên và Email là thông tin bắt buộc.");
            }

            // Chuẩn hóa chuỗi Email trước khi lưu
            const normalizedEmail = Email.trim().toLowerCase();

            const result = await authService.registerProcess(register_token, Name, normalizedEmail, Address);

            return sendSuccess(res, 201, "Đăng ký thành công", {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                user: result.user
            });
        } catch (error) {
            if (error.message === "Phiên đăng ký không hợp lệ hoặc đã hết hạn.") {
                return sendError(res, 401, error.message);
            }
            if (error.message === "Email này đã được sử dụng cho một tài khoản khác.") {
                return sendError(res, 409, error.message);
            }
            if (error.name === "ValidationError") {
                return sendError(res, 400, "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại định dạng Email.");
            }
            return sendError(res, 500, "Lỗi hệ thống");
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
            if (
                error.message === "Refresh token không hợp lệ." ||
                error.message === "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
            ) {
                return sendError(res, 401, error.message);
            }
            if (error.message === "Refresh token đã bị thu hồi hoặc không chính xác.") {
                return sendError(res, 403, error.message);
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // [POST] /auth/logout
    logout: async (req, res) => {
        try {
            await authService.logoutProcess(req.user.userId);
            return sendSuccess(res, 200, "Đăng xuất thành công.");
        } catch (error) {
            return sendError(res, 500, "Đã xảy ra lỗi hệ thống khi đăng xuất. Vui lòng thử lại.");
        }
    }
};

module.exports = authController;