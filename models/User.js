const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Address: { type: String },
    Phone: { type: String },
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
        // Dùng arrow function để lấy thời gian động tại thời điểm tạo document
        default: () => new Date(Date.now() + 3 * 60 * 1000)
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);