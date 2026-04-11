const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    PromotionName: { type: String, required: true },
    TermsAndConditions: { type: String },
    StartDate: { type: Date, required: true }, // Trong ERD ghi là StateDate, mình sửa lại StartDate cho chuẩn logic
    EndDate: { type: Date, required: true },
    IsActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);