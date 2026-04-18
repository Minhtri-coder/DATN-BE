const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    UserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Thêm index để tìm kiếm pet theo User nhanh hơn
    },
    Name: { type: String, required: true },
    Species: { type: String, required: true }, // Chó, Mèo...
    Breed: { type: String }, // Giống
    Size: { type: String, enum: ['S', 'M', 'L', 'XL'] },
    Weight: { type: Number },
    Gender: { type: String, enum: ['Male', 'Female', 'Unknown'] },
    Temperament: { type: String }, // Tính cách
    SpecialNotes: { type: String },
    HealthStatus: { type: String },
    Image: { type: String },

    // TRƯỜNG MỚI: Trạng thái của thú cưng
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

module.exports = mongoose.model('Pet', petSchema);