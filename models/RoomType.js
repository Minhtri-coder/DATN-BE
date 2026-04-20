const mongoose = require('mongoose');

// ==========================================
// 1. ĐỊNH NGHĨA CÁC ENUM CONSTANTS
// ==========================================

// Loài thú cưng phù hợp
const SPECIES_TYPES = ['Dog', 'Cat', 'Both', 'Other', 'All'];

// Tính cách/Hành vi phù hợp (Để xếp các bé hiếu động không ở gần bé nhát)
const BEHAVIOR_TYPES = ['Friendly', 'Aggressive', 'Timid', 'Energetic', 'Any'];

// Loại điều hòa nhiệt độ
const TEMP_TYPES = ['AC', 'Fan', 'Natural']; // AC = Máy lạnh

// Phân loại phòng theo tình trạng sức khỏe
const HEALTH_SUITABILITY = ['Normal', 'Pregnant', 'Infectious', 'Recovering', 'Special_Care'];

// Trạng thái phòng
const STATUS_TYPES = ['Available', 'Maintenance', 'Deleted'];

// ==========================================
// 2. SCHEMA DEFINITION
// ==========================================

const roomTypeSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Description: { type: String },

    SpeciesType: {
        type: String,
        enum: SPECIES_TYPES,
        default: 'All'
    },

    BehaviorType: {
        type: String,
        enum: BEHAVIOR_TYPES,
        default: 'Any'
    },

    TempType: {
        type: String,
        enum: TEMP_TYPES,
        default: 'AC' // Mặc định là phòng máy lạnh
    },

    HealthSuitability: {
        type: String,
        enum: HEALTH_SUITABILITY,
        default: 'Normal'
    },

    // Mảng URL ảnh trực tiếp
    Images: [{ type: String }],

    // Trạng thái của loại phòng
    Status: {
        type: String,
        required: true,
        enum: STATUS_TYPES,
        default: 'Available'
    }
}, { timestamps: true });

// Index để truy vấn nhanh hơn theo trạng thái
roomTypeSchema.index({ Status: 1 });

const RoomType = mongoose.model('RoomType', roomTypeSchema);

// ==========================================
// 3. EXPORT KÈM ENUM (Để tái sử dụng)
// ==========================================
// Gắn các mảng Enum vào model để Controller/Validator có thể gọi: RoomType.ENUMS.TEMP_TYPES
RoomType.ENUMS = {
    SPECIES_TYPES,
    BEHAVIOR_TYPES,
    TEMP_TYPES,
    HEALTH_SUITABILITY,
    STATUS_TYPES
};

module.exports = RoomType;