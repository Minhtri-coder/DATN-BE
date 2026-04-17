const User = require('../models/User');
const bcrypt = require('bcryptjs');
// Import các hàm từ file jwt.js (Lưu ý sửa lại đường dẫn '../utils/jwt' cho đúng với thư mục của bạn)
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    signRegisterToken,
    verifyRegisterToken
} = require('../utils/jwt');

const authService = {

    // 1. GỬI MÃ OTP
    sendOtpProcess: async (phone) => {
        const otpCode = "1234";
        const otpTime = new Date(Date.now() + 3 * 60 * 1000);

        let user = await User.findOne({ Phone: phone });

        if (!user) {
            user = new User({
                Phone: phone,
                Name: "New User",
                otpCode: otpCode,
                otpTime: otpTime,
                isActive: false
            });
        } else {
            user.otpCode = otpCode;
            user.otpTime = otpTime;
        }

        await user.save();
        return true;
    },

    // 2. XÁC THỰC MÃ OTP
    verifyOtpProcess: async (phone, otp) => {
        const user = await User.findOne({ Phone: phone });

        if (!user) throw new Error("Mã OTP không chính xác.");
        if (user.otpCode !== otp) throw new Error("Mã OTP không chính xác.");
        if (new Date() > user.otpTime) throw new Error("Mã OTP đã hết hạn.");

        user.otpCode = undefined;
        user.otpTime = undefined;

        if (user.isActive) {
            // DÙNG HÀM TỪ JWT UTILS
            const access_token = signAccessToken({ id: user._id, role: user.Role });
            const refresh_token = signRefreshToken({ id: user._id });

            const salt = await bcrypt.genSalt(10);
            user.HashedRefreshToken = await bcrypt.hash(refresh_token, salt);
            await user.save();

            return {
                is_new_user: false,
                access_token,
                refresh_token,
                user: { id: user._id, name: user.Name, phone: user.Phone }
            };
        }
        else {
            await user.save();
            // DÙNG HÀM TỪ JWT UTILS
            const register_token = signRegisterToken({ phone: user.Phone });

            return {
                is_new_user: true,
                register_token
            };
        }
    },

    // 3. ĐĂNG KÝ TÀI KHOẢN MỚI
    registerProcess: async (register_token, name, email, address) => {
        let decoded;
        try {
            // DÙNG HÀM TỪ JWT UTILS
            decoded = verifyRegisterToken(register_token);
        } catch (err) {
            throw new Error("Phiên đăng ký không hợp lệ hoặc đã hết hạn.");
        }

        const phone = decoded.phone;

        const emailExists = await User.findOne({ Email: email });
        if (emailExists) {
            throw new Error("Email này đã được sử dụng cho một tài khoản khác.");
        }

        const user = await User.findOne({ Phone: phone });
        if (!user) throw new Error("Phiên đăng ký không hợp lệ hoặc đã hết hạn.");

        user.Name = name;
        user.Email = email;
        user.Address = address;
        user.isActive = true;

        // DÙNG HÀM TỪ JWT UTILS
        const access_token = signAccessToken({ id: user._id, role: user.Role });
        const refresh_token = signRefreshToken({ id: user._id });

        const salt = await bcrypt.genSalt(10);
        user.HashedRefreshToken = await bcrypt.hash(refresh_token, salt);
        await user.save();

        return {
            access_token,
            refresh_token,
            user: { id: user._id, name: user.Name, phone: user.Phone }
        };
    },

    // 4. LÀM MỚI TOKEN (REFRESH TOKEN)
    refreshTokenProcess: async (refresh_token) => {
        let decoded;
        try {
            // DÙNG HÀM TỪ JWT UTILS
            decoded = verifyRefreshToken(refresh_token);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
            }
            throw new Error("Refresh token không hợp lệ.");
        }

        const user = await User.findById(decoded.id);

        if (!user || !user.HashedRefreshToken) {
            throw new Error("Refresh token đã bị thu hồi hoặc không chính xác.");
        }

        const isValid = await bcrypt.compare(refresh_token, user.HashedRefreshToken);
        if (!isValid) {
            throw new Error("Refresh token đã bị thu hồi hoặc không chính xác.");
        }

        // DÙNG HÀM TỪ JWT UTILS
        const new_access_token = signAccessToken({ id: user._id, role: user.Role });
        const new_refresh_token = signRefreshToken({ id: user._id });

        const salt = await bcrypt.genSalt(10);
        user.HashedRefreshToken = await bcrypt.hash(new_refresh_token, salt);
        await user.save();

        return {
            access_token: new_access_token,
            refresh_token: new_refresh_token
        };
    },

    // 5. ĐĂNG XUẤT
    logoutProcess: async (userId) => {
        const user = await User.findById(userId);
        if (!user) throw new Error("Không tìm thấy người dùng");

        user.HashedRefreshToken = null;
        await user.save();

        return true;
    }
};

module.exports = authService;