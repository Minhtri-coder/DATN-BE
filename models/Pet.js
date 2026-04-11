const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    UserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Name: { type: String, required: true },
    Species: { type: String, required: true }, // Chó, Mèo...
    Breed: { type: String }, // Giống
    Size: { type: String, enum: ['S', 'M', 'L', 'XL'] },
    Weight: { type: Number },
    Gender: { type: String, enum: ['Male', 'Female', 'Unknown'] },
    Temperament: { type: String }, // Tính cách
    SpecialNotes: { type: String },
    HealthStatus: { type: String },
    Image: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Pet', petSchema);