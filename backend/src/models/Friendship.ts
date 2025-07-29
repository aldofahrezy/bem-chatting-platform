import mongoose, { Document, Schema, Types } from 'mongoose';

// Definisikan interface untuk dokumen Friendship
export interface IFriendship extends Document {
  requester: Types.ObjectId; // Pengguna yang mengirim permintaan
  recipient: Types.ObjectId; // Pengguna yang menerima permintaan
  status: 'pending' | 'accepted' | 'rejected'; // Status permintaan
}

// Definisikan skema Friendship
const FriendshipSchema: Schema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

// Pastikan hanya ada satu permintaan pertemanan unik antara dua pengguna
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model<IFriendship>('Friendship', FriendshipSchema);