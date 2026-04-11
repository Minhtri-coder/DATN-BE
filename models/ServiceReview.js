const mongoose = require('mongoose');

const serviceReviewSchema = new mongoose.Schema({
    ServiceDetailID: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceDetail', required: true },
    Title: { type: String },
    Image: { type: String },
    Content: { type: String },
    Rating: { type: Number, min: 1, max: 5, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ServiceReview', serviceReviewSchema);