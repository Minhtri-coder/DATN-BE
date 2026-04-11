const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    SenderID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ReceiverID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Content: { type: String, required: true },
    Type: { type: String, enum: ['Text', 'Video', 'Image'], default: 'Text' },
    SentAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);