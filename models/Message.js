import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    date: {
        type: Date,
        default: Date.now
    },
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }
});

export default mongoose.model('Message', messageSchema);
