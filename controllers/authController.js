const authService = require('../services/authServices');

const authController = {
    // [POST] /auth/send-otp
    sendOtp: async (req, res) => {
        try {
            const { Phone } = req.body;

            // Validate định dạng SĐT (Bắt đầu bằng 0 hoặc +84, kèm 9 số)
            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!phoneRegex.test(Phone)) {
                return res.status(400).json({ status: false, message: "SĐT không hợp lệ." });
            }

            await authService.sendOtpProcess(Phone);

            return res.status(200).json({
                status: true,
                message: "Đã gửi mã OTP thành công.",
                data: {
                    test_otp: "1234" // Tạm thời trả về 1234 để Frontend/Dev dễ test luồng
                }
            });

        } catch (error) {
            return res.status(500).json({ status: false, message: error.message || "Lỗi hệ thống..." });
        }
    },

    // [POST] /auth/verify-otp
    verifyOtp: async (req, res) => {
        try {
            const { Phone, OTP } = req.body;
            const result = await authService.verifyOtpProcess(Phone, OTP);

            if (result.is_new_user) {
                // Case: User chưa tồn tại trong DB (Chưa active)
                return res.status(200).json({
                    status: true,
                    message: "Số điện thoại mới, vui lòng cập nhật thông tin",
                    data: {
                        is_new_user: true,
                        register_token: result.register_token
                    }
                });
            } else {
                // Case: User đã tồn tại (Đăng nhập thành công)
                return res.status(200).json({
                    status: true,
                    message: "Đăng nhập thành công",
                    data: {
                        is_new_user: false,
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                        user: result.user
                    }
                });
            }

        } catch (error) {
            // Xử lý lỗi OTP sai hoặc hết hạn
            if (error.message === "Mã OTP không chính xác." || error.message === "Mã OTP đã hết hạn.") {
                return res.status(400).json({ status: false, message: error.message });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    // [POST] /auth/register
    register: async (req, res) => {
        try {
            const { register_token, Name, Email, Address } = req.body;

            const result = await authService.registerProcess(register_token, Name, Email, Address);

            return res.status(201).json({
                status: true,
                message: "Đăng ký thành công",
                data: {
                    access_token: result.access_token,
                    refresh_token: result.refresh_token,
                    user: result.user
                }
            });

        } catch (error) {
            if (error.message === "Phiên đăng ký không hợp lệ hoặc đã hết hạn.") {
                return res.status(401).json({ status: false, message: error.message });
            }
            if (error.message === "Email này đã được sử dụng cho một tài khoản khác.") {
                return res.status(409).json({ status: false, message: error.message });
            }
            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    // [POST] /auth/refresh
    refreshToken: async (req, res) => {
        try {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                return res.status(400).json({ status: false, message: "Vui lòng cung cấp refresh token." });
            }

            const result = await authService.refreshTokenProcess(refresh_token);

            return res.status(200).json({
                status: true,
                message: "Làm mới phiên đăng nhập thành công",
                data: result
            });

        } catch (error) {
            // Xử lý các mã lỗi theo document
            if (error.message === "Refresh token không hợp lệ.") {
                return res.status(401).json({ status: false, message: error.message });
            }
            if (error.message === "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.") {
                return res.status(401).json({ status: false, message: error.message });
            }
            if (error.message === "Refresh token đã bị thu hồi hoặc không chính xác.") {
                return res.status(403).json({ status: false, message: error.message });
            }

            return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
        }
    },

    // [POST] /auth/logout
    logout: async (req, res) => {
        try {
            // req.user.userId được lấy từ authMiddleware đã decode
            await authService.logoutProcess(req.user.userId);

            return res.status(200).json({
                status: true,
                message: "Đăng xuất thành công."
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Đã xảy ra lỗi hệ thống khi đăng xuất. Vui lòng thử lại."
            });
        }
    }
};

module.exports = authController;