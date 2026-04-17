const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');

const authController = {
    // [POST] /auth/send-otp
    sendOtp: async (req, res) => {
        try {
            const { Phone } = req.body;
            const PhoneTrim = Phone.trim();

            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!phoneRegex.test(PhoneTrim)) {
                return sendError(res, 400, "SĐT không hợp lệ.");
            }

            await authService.sendOtpProcess(PhoneTrim);

            return sendSuccess(res, 200, "Đã gửi mã OTP thành công.", { test_otp: "1234" });
        } catch (error) {
            return sendError(res, 500, error.message || "Lỗi hệ thống...");
        }
    },

    // [POST] /auth/verify-otp
    verifyOtp: async (req, res) => {
        try {
            const { Phone, OTP } = req.body;
            const result = await authService.verifyOtpProcess(Phone, OTP);

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
            if (error.message === "Mã OTP không chính xác." || error.message === "Mã OTP đã hết hạn.") {
                return sendError(res, 400, error.message);
            }
            return sendError(res, 500, "Lỗi hệ thống");
        }
    },

    // [POST] /auth/register
    register: async (req, res) => {
        try {
            const { register_token, Name, Email, Address } = req.body;
            const result = await authService.registerProcess(register_token, Name, Email, Address);

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
            if (error.message === "Refresh token không hợp lệ." || error.message === "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.") {
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