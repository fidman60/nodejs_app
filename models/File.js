import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({}, { strict: false, collection: 'fs.files' });

export default mongoose.model('File', fileSchema);
