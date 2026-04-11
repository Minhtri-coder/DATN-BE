const mongoose = require('mongoose');

const boardingDetailSchema = new mongoose.Schema({
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    BoxID: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true },
    CheckInDate: { type: Date, required: true },
    CheckOutDate: { type: Date, required: true },
    Notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('BoardingDetail', boardingDetailSchema);