const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    PetID: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    PromotionID: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
    Status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
    HealthStatus: { type: String }, // Tình trạng sức khỏe lúc nhận
    DepositAmount: { type: Number, default: 0 },
    TotalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);