const mongoose = require('mongoose');

const serviceDetailSchema = new mongoose.Schema({
    ServiceID: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    PriceAtBooking: { type: Number, required: true }, // Lưu lại giá tại thời điểm đặt để tránh sai lệch báo cáo nếu sau này đổi giá Service
    ScheduledTime: { type: Date },
    Status: { type: String, enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'], default: 'Pending' },
    Note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ServiceDetail', serviceDetailSchema);