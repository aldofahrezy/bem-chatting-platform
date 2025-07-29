import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';

// Perluas antarmuka Request untuk menyertakan properti 'user'
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser; // Tambahkan properti user ke objek Request
  }
}

// Middleware for Basic Authentication
export const basicAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).json({ message: 'Otentikasi diperlukan.' });
  }

  const [authType, credentials] = authHeader.split(' ');

  if (authType !== 'Basic' || !credentials) {
    return res.status(401).json({ message: 'Format otentikasi tidak valid.' });
  }

  try {
    const decodedCredentials = Buffer.from(credentials, 'base64').toString('utf8');
    const [username, password] = decodedCredentials.split(':');

    if (!username || !password) {
      return res.status(401).json({ message: 'Kredensial tidak lengkap.' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Nama pengguna atau kata sandi salah.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Nama pengguna atau kata sandi salah.' });
    }

    req.user = user; // Sekarang tidak perlu 'as any'
    next();
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan otentikasi:', err);
      res.status(500).json({ message: 'Kesalahan server saat otentikasi: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat otentikasi: An unknown error occurred.' });
    }
  }
};

// Controller for user registration
export const registerUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nama pengguna dan kata sandi diperlukan.' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Nama pengguna sudah ada.' });
    }

    const newUser: IUser = new User({ username, password });
    await newUser.save();

    res.status(201).json({ message: 'Pengguna berhasil terdaftar!', userId: newUser._id });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan registrasi pengguna:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendaftar pengguna: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendaftar pengguna: An unknown error occurred.' });
    }
  }
};

// Controller for user login
export const loginUser = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nama pengguna dan kata sandi diperlukan.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Nama pengguna atau kata sandi salah.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Nama pengguna atau kata sandi salah.' });
    }

    res.status(200).json({ message: 'Login berhasil!', userId: user._id, username: user.username });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan login pengguna:', err);
      res.status(500).json({ message: 'Kesalahan server saat login: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat login: An unknown error occurred.' });
    }
  }
};