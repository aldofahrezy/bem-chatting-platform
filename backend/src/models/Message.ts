import mongoose, { Document, Schema, Types } from 'mongoose';

// Definisikan interface untuk dokumen Message
export interface IMessage extends Document {
  sender: Types.ObjectId; // ID pengguna pengirim
  receiver: Types.ObjectId; // ID pengguna penerima (untuk 1-on-1 chat)
  content: string;
  timestamp: Date;
}

// Definisikan skema Message
const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IMessage>('Message', MessageSchema);
