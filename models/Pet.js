const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    UserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    Name: { type: String, required: true },
    Species: { type: String, required: true }, // Chó, Mèo...
    Breed: { type: String }, // Giống
    Size: { type: String, enum: ['S', 'M', 'L', 'XL'] },
    Weight: { type: Number },
    // SỬA: Đổi Enum Gender thành IN HOA toàn bộ để đồng bộ với hàm normalize
    Gender: { type: String, enum: ['MALE', 'FEMALE', 'UNKNOWN'] },
    Temperament: { type: String }, // Tính cách
    SpecialNotes: { type: String },
    HealthStatus: { type: String },
    Image: { type: String },

    Status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'DELETED'],
        default: 'DRAFT',
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound Index: Đảm bảo hiệu năng cho logic tìm Draft của User
petSchema.index(
    { UserID: 1, Status: 1 },
    { unique: true, partialFilterExpression: { Status: 'DRAFT' } }
);

// BẮT BUỘC: Export ENUMS để Controller lấy ra Validate
petSchema.statics.ENUMS = {
    SIZES: ['S', 'M', 'L', 'XL'],
    GENDERS: ['MALE', 'FEMALE', 'UNKNOWN'],
    STATUS: ['DRAFT', 'ACTIVE', 'DELETED']
};

module.exports = mongoose.model('Pet', petSchema);