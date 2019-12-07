import mongoose from 'mongoose';

let userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    }
});

export default mongoose.model('User', userSchema);
