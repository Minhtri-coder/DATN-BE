const mongoose = require('mongoose');

const SIZE_CATEGORIES = ['S', 'M', 'L', 'XL'];
const STATUS_TYPES = ['Available', 'Occupied', 'Maintenance', 'Deleted'];

const boxSchema = new mongoose.Schema({
    RoomTypeID: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    BoxName: { type: String, required: true },
    SizeCategory: { type: String, enum: SIZE_CATEGORIES },
    Price: { type: Number, required: true },
    Status: { type: String, enum: STATUS_TYPES, default: 'Available' }
}, { timestamps: true });

const Box = mongoose.model('Box', boxSchema);

// Export Enums để dùng ở Controller
Box.ENUMS = {
    SIZE_CATEGORIES,
    STATUS_TYPES
};

module.exports = Box;