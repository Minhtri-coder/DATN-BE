const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Description: { type: String },
    SpeciesType: { type: String },
    BehaviorType: { type: String },
    TempType: { type: String }, // Máy lạnh, quạt, tự nhiên
    HealthSuitability: { type: String }, // Ví dụ: Cho pet mang thai

    // Mảng URL ảnh trực tiếp
    Images: [{ type: String }],

    // Trạng thái của loại phòng
    Status: {
        type: String,
        required: true,
        enum: ['Available', 'Maintenance', 'Deleted'],
        default: 'Available'
    }
}, { timestamps: true });

// Index để truy vấn nhanh hơn theo trạng thái
roomTypeSchema.index({ Status: 1 });

module.exports = mongoose.model('RoomType', roomTypeSchema);