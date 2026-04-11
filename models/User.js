const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    Address: { type: String },
    Phone: { type: String },
    Role: { type: String, enum: ['Admin', 'Staff', 'Customer'], default: 'Customer' },
    HashedPassword: { type: String, required: true },
    AvatarURL: { type: String },
    HashedRefreshToken: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);