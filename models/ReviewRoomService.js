const mongoose = require('mongoose');

const reviewRoomServiceSchema = new mongoose.Schema({
    BoardingDetailID: { type: mongoose.Schema.Types.ObjectId, ref: 'BoardingDetail', required: true },
    BoxID: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true },
    Title: { type: String },
    Content: { type: String },
    Rating: { type: Number, min: 1, max: 5, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ReviewRoomService', reviewRoomServiceSchema);