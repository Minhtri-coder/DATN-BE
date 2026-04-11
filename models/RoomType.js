const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Description: { type: String },
    SpeciesType: { type: String }, 
    BehaviorType: { type: String },
    TempType: { type: String }, // Máy lạnh, quạt, tự nhiên
    HealthSuitability: { type: String }, // Ví dụ: Cho pet mang thai
    // Tối ưu hóa: Thay vì tạo bảng RoomImages riêng, ta lưu mảng URL ảnh trực tiếp
    Images: [{ type: String }] 
}, { timestamps: true });

module.exports = mongoose.model('RoomType', roomTypeSchema);