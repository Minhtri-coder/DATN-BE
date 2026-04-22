const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { signAccessToken, signRefreshToken, signRegisterToken, verifyRegisterToken, verifyRefreshToken } = require('../utils/jwt');

const authService = {
    // 1. GỬI MÃ OTP (Dành cho User thông thường)
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

    // 1b. GỬI MÃ OTP (Dành cho Admin/Employee - chỉ gửi nếu tài khoản tồn tại và có Role >= 1)
    sendAdminOtpProcess: async (phone) => {
        const user = await User.findOne({ Phone: phone }).lean();

        // Không tiết lộ lý do cụ thể để tránh lộ thông tin tài khoản
        if (!user || user.Role < 1) {
            throw new Error("FORBIDDEN: Số điện thoại này không có quyền truy cập hệ thống quản trị.");
        }

        const otpCode = "1234"; // Dummy OTP cho môi trường test
        const otpTime = new Date(Date.now() + 3 * 60 * 1000);

        await User.updateOne({ _id: user._id }, { otpCode, otpTime });
        return true;
    },

    // 2. XÁC THỰC MÃ OTP
    // 2. XÁC THỰC MÃ OTP
    verifyOtpProcess: async (phone, otp) => {
        // Không dùng .lean() vì bên dưới cần gọi .save()
        const user = await User.findOne({ Phone: phone });

        if (!user || user.otpCode !== otp) throw new Error("BAD_REQUEST: Mã OTP không chính xác.");
        if (new Date() > user.otpTime) throw new Error("BAD_REQUEST: Mã OTP đã hết hạn.");

        // Xóa OTP ngay lập tức sau khi xác thực đúng để tránh dùng lại (Replay Attack)
        user.otpCode = undefined;
        user.otpTime = undefined;

        if (user.isActive) {
            // [TRƯỜNG HỢP 1]: User hợp lệ và đang hoạt động -> Cho phép đăng nhập
            const access_token = signAccessToken({ userId: user._id, role: user.Role });
            const refresh_token = signRefreshToken({ userId: user._id });

            user.HashedRefreshToken = await bcrypt.hash(refresh_token, 10);
            await user.save();

            // Chuẩn hóa và làm phẳng dữ liệu trả về (Flatten)
            const userInfo = {
                Name: user.Name,
                Email: user.Email,
                Phone: user.Phone,
                Address: user.Address,
                AvatarURL: user.AvatarURL
            };

            return { is_new_user: false, access_token, refresh_token, user: userInfo };

        } else {
            // [TRƯỜNG HỢP 2]: user.isActive === false
            // Kiểm tra xem đây là User bị khóa hay User mới đang chờ đăng ký

            if (user.Email) {
                // Đã có Email tức là đã từng đăng ký thành công, nhưng isActive = false -> BỊ KHÓA
                await user.save(); // Vẫn phải save để lưu việc đã clear mã OTP
                throw new Error("FORBIDDEN: Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
            }

            // Chưa có Email -> User mới đang trong luồng tạo tài khoản
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

        // Lệnh này cần cập nhật data nên bỏ .lean()
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

        // Chuẩn hóa và làm phẳng dữ liệu trả về (Flatten)
        const userInfo = {
            Name: user.Name,
            Email: user.Email,
            Phone: user.Phone,
            Address: user.Address,
            AvatarURL: user.AvatarURL
        };

        return { access_token, refresh_token, user: userInfo };
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