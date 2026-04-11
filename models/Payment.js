const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    BookingID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    PaymentMethod: { type: String, enum: ['Cash', 'CreditCard', 'BankTransfer', 'Momo', 'ZaloPay'], required: true },
    Amount: { type: Number, required: true },
    Status: { type: String, enum: ['Pending', 'Completed', 'Failed', 'Refunded'], default: 'Pending' },
    PaidAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);