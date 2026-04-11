const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
    RoomTypeID: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    BoxName: { type: String, required: true },
    SizeCategory: { type: String, enum: ['S', 'M', 'L', 'XL'] },
    Price: { type: Number, required: true },
    Status: { type: String, enum: ['Available', 'Occupied', 'Maintenance'], default: 'Available' }
}, { timestamps: true });

module.exports = mongoose.model('Box', boxSchema);