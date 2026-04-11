const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
    PublisherID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Nhân viên đăng
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    Title: { type: String, required: true },
    Image: { type: String },
    Video: { type: String },
    Content: { type: String },
    MealNotes: { type: String }, // Ghi chú về bữa ăn
    PublishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ActionLog', actionLogSchema);