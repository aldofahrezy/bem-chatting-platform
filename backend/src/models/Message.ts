import mongoose, { Document, Schema, Types } from 'mongoose';

// Definisikan interface untuk dokumen Message
export interface IMessage extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  content: string;
  timestamp: Date;
  status: 'normal' | 'request';
  deletedFor: Types.ObjectId[];
  isEdited: boolean;
}

// Definisikan skema Message
const MessageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['normal', 'request'], default: 'normal' },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
});

export default mongoose.model<IMessage>('Message', MessageSchema);
