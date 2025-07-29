import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Definisikan interface untuk dokumen User
export interface IUser extends Document {
  username: string;
  password: string;
  // Menambahkan definisi untuk metode kustom
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

// Definisikan skema User
const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true }); // Menambahkan createdAt dan updatedAt secara otomatis

// Middleware Mongoose untuk hashing password sebelum disimpan
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: unknown) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred during password hashing."));
    }
  }
});

// Metode untuk membandingkan password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
