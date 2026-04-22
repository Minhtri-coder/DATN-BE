const mongoose = require('mongoose');

// ==========================================
// 1. ĐỊNH NGHĨA CÁC ENUM CONSTANTS
// ==========================================
const SIZE_CATEGORIES = ['S', 'M', 'L', 'XL'];
// Thêm 'Reserved' (Sắp có khách / Đã đặt trước) vào danh sách trạng thái
const STATUS_TYPES = ['Available', 'Reserved', 'Occupied', 'Maintenance', 'Deleted'];

const boxSchema = new mongoose.Schema({
    RoomTypeID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoomType',
        required: true,
        index: true // BẮT BUỘC: Đánh index để truy vấn ngược từ RoomType
    },
    BoxName: { type: String, required: true },
    SizeCategory: {
        type: String,
        enum: SIZE_CATEGORIES,
        required: true // BẮT BUỘC: Phải có size để filter với Pet.Size
    },
    Price: { type: Number, required: true },
    Status: {
        type: String,
        enum: STATUS_TYPES,
        default: 'Available',
        index: true // BẮT BUỘC: Đánh index để lọc danh sách phòng trống
    }
}, { timestamps: true });

// Compound Index: Cực kỳ quan trọng cho thuật toán Booking sau này.
// Khi tìm phòng trống, chúng ta sẽ query: { RoomTypeID: id, Status: 'Available' }
boxSchema.index({ RoomTypeID: 1, Status: 1 });

// BẮT BUỘC: Export ENUMS qua statics theo đúng Core Document
boxSchema.statics.ENUMS = {
    SIZE_CATEGORIES,
    STATUS_TYPES
};

module.exports = mongoose.model('Box', boxSchema);