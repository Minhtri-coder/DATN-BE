const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { signAccessToken, signRefreshToken, signRegisterToken, verifyRegisterToken, verifyRefreshToken } = require('../utils/jwt');

const authService = {
    // 1. GỬI MÃ OTP
    sendOtpProcess: async (phone) => {
        const otpCode = "1234"; // Dummy OTP cho môi trường test
        const otpTime = new Date(Date.now() + 3 * 60 * 1000);

        let user = await User.findOne({ Phone: phone });
        if (!user) {
            user = new User({ Phone: phone, Name: "Người dùng mới", isActive: false });
        }

        user.otpCode = otpCode;
        user.otpTime = otpTime;
        await user.save();

        return true;
    },

    // 2. XÁC THỰC MÃ OTP
    verifyOtpProcess: async (phone, otp) => {
        const user = await User.findOne({ Phone: phone });

        if (!user || user.otpCode !== otp) throw new Error("BAD_REQUEST: Mã OTP không chính xác.");
        if (new Date() > user.otpTime) throw new Error("BAD_REQUEST: Mã OTP đã hết hạn.");

        user.otpCode = undefined;
        user.otpTime = undefined;

        if (user.isActive) {
            const access_token = signAccessToken({ userId: user._id, role: user.Role });
            const refresh_token = signRefreshToken({ userId: user._id });

            user.HashedRefreshToken = await bcrypt.hash(refresh_token, 10);
            await user.save();

            return { is_new_user: false, access_token, refresh_token, user };
        } else {
            await user.save();
            const register_token = signRegisterToken({ phone: user.Phone });

            return { is_new_user: true, register_token };
        }
    },

    // 3. ĐĂNG KÝ TÀI KHOẢN MỚI
    registerProcess: async (registerToken, name, email, address) => {
        let decoded;
        try {
            decoded = verifyRegisterToken(registerToken);
        } catch (e) {
            throw new Error("UNAUTHORIZED: Phiên đăng ký không hợp lệ hoặc đã hết hạn.");
        }

        // Lệnh Read-only -> BẮT BUỘC dùng .lean()
        const emailExists = await User.findOne({ Email: email }).lean();
        if (emailExists) throw new Error("CONFLICT: Email này đã được sử dụng cho một tài khoản khác.");

        const user = await User.findOne({ Phone: decoded.phone });
        if (!user) throw new Error("NOT_FOUND: Không tìm thấy hồ sơ chờ đăng ký.");

        user.Name = name;
        user.Email = email;
        if (address) user.Address = address;
        user.isActive = true;

        const access_token = signAccessToken({ userId: user._id, role: user.Role });
        const refresh_token = signRefreshToken({ userId: user._id });

        user.HashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        await user.save();

        return { access_token, refresh_token, user };
    },

    // 4. LÀM MỚI TOKEN (REFRESH TOKEN)
    refreshTokenProcess: async (refresh_token) => {
        let decoded;
        try {
            decoded = verifyRefreshToken(refresh_token);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw new Error("UNAUTHORIZED: Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
            }
            throw new Error("BAD_REQUEST: Refresh token không hợp lệ.");
        }

        // Không dùng .lean() ở đây vì lát nữa chúng ta cần gọi user.save()
        const user = await User.findById(decoded.userId);

        if (!user || !user.HashedRefreshToken) {
            throw new Error("FORBIDDEN: Refresh token đã bị thu hồi hoặc không tồn tại.");
        }

        const isValid = await bcrypt.compare(refresh_token, user.HashedRefreshToken);
        if (!isValid) {
            throw new Error("FORBIDDEN: Refresh token đã bị thu hồi hoặc không chính xác.");
        }

        const new_access_token = signAccessToken({ userId: user._id, role: user.Role });
        const new_refresh_token = signRefreshToken({ userId: user._id });

        user.HashedRefreshToken = await bcrypt.hash(new_refresh_token, 10);
        await user.save();

        return {
            access_token: new_access_token,
            refresh_token: new_refresh_token
        };
    },

    // 5. ĐĂNG XUẤT
    logoutProcess: async (userId) => {
        // Không dùng .lean() vì cần lưu lại data
        const user = await User.findById(userId);
        if (!user) throw new Error("NOT_FOUND: Không tìm thấy người dùng.");

        user.HashedRefreshToken = null;
        await user.save();

        return true;
    }
};

module.exports = authService;