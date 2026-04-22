const mongoose = require('mongoose');

// ==========================================
// 1. ĐỊNH NGHĨA CÁC ENUM CONSTANTS CHO PET (PASCALCASE)
// ==========================================
const SPECIES = ['Dog', 'Cat', 'Other'];
const BEHAVIORS = ['Friendly', 'Aggressive', 'Timid', 'Energetic'];
const HEALTH_STATUSES = ['Normal', 'Pregnant', 'Infectious', 'Recovering', 'Special_Care'];

const petSchema = new mongoose.Schema({
    UserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    Name: { type: String, required: true },
    Species: {
        type: String,
        enum: SPECIES,
        required: true
    },

    Breed: { type: String }, // Giống (Husky, Corgi,...)
    Size: { type: String, enum: ['S', 'M', 'L', 'XL'] },
    Weight: { type: Number, min: [0, 'Cân nặng không được là số âm'], max: [200, 'Cân nặng không được vượt quá 200'] },
    Gender: { type: String, enum: ['Male', 'Female', 'Unknown'] },

    // Đồng bộ hoàn toàn với RoomType.BehaviorType
    Behavior: {
        type: String,
        enum: BEHAVIORS
    },

    SpecialNotes: { type: String },

    // Đồng bộ hoàn toàn với RoomType.HealthSuitability
    HealthStatus: {
        type: String,
        enum: HEALTH_STATUSES,
        default: 'Normal' // Đã sửa thành PascalCase
    },

    Image: { type: String },

    Status: {
        type: String,
        enum: ['Draft', 'Active', 'Deleted'],
        default: 'Draft', // Đã sửa thành PascalCase
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound Index: Đảm bảo hiệu năng cho logic tìm Draft của User
petSchema.index(
    { UserID: 1, Status: 1 },
    // CHÚ Ý CRITICAL: Phải đổi điều kiện filter thành 'Draft' cho khớp với Default và Enum
    { unique: true, partialFilterExpression: { Status: 'Draft' } }
);

// BẮT BUỘC: Export ENUMS để Controller lấy ra Validate
petSchema.statics.ENUMS = {
    SIZES: ['S', 'M', 'L', 'XL'],
    GENDERS: ['Male', 'Female', 'Unknown'],
    STATUS: ['Draft', 'Active', 'Deleted'],
    SPECIES,
    BEHAVIORS,
    HEALTH_STATUSES
};

module.exports = mongoose.model('Pet', petSchema);