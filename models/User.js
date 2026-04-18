const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Name: { type: String, required: true },

    // ĐÃ SỬA: Không bắt buộc, Unique, và Sparse
    Email: {
        type: String, // Chú ý: Cần thêm type: String
        required: false, // Không bắt buộc lúc mới tạo OTP
        unique: true,
        sparse: true, // QUAN TRỌNG: Bỏ qua check Unique nếu user không có trường Email
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Vui lòng cung cấp một địa chỉ email hợp lệ']
    },

    Address: { type: String },
    Phone: { type: String, unique: true },
    Role: {
        type: Number,
        enum: [0, 1, 2],
        default: 0 // 0: user, 1: employee, 2: admin
    },
    AvatarURL: { type: String },
    HashedRefreshToken: { type: String },
    isActive: { type: Boolean, default: false },
    otpCode: {
        type: String,
        match: [/^[1-9]{4}$/, 'OTP phải bao gồm đúng 4 chữ số từ 1 đến 9']
    },
    otpTime: {
        type: Date,
        default: () => new Date(Date.now() + 3 * 60 * 1000)
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);