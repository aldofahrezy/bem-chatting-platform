import { Request, Response } from 'express'; // Import Request dari express
import Message, { IMessage } from '../models/Message';
import User from '../models/User';

// Create (C) - Mengirim pesan baru
export const createMessage = async (req: Request, res: Response) => { // Gunakan Request biasa
  const { receiverUsername, content } = req.body;
  const senderId = req.user?._id; // Sekarang req.user memiliki tipe IUser | undefined

  if (!senderId) {
    return res.status(401).json({ message: 'Pengirim tidak terotentikasi.' });
  }
  if (!receiverUsername || !content) {
    return res.status(400).json({ message: 'Nama pengguna penerima dan konten pesan diperlukan.' });
  }

  try {
    // Temukan ID penerima berdasarkan username
    const receiverUser = await User.findOne({ username: receiverUsername });
    if (!receiverUser) {
      return res.status(404).json({ message: 'Pengguna penerima tidak ditemukan.' });
    }

    const newMessage: IMessage = new Message({
      sender: senderId,
      receiver: receiverUser._id,
      content: content,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan membuat pesan:', err);
      res.status(500).json({ message: 'Kesalahan server saat membuat pesan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat membuat pesan: An unknown error occurred.' });
    }
  }
};

// Read (R) - Mendapatkan pesan antara dua pengguna
export const getMessages = async (req: Request, res: Response) => { // Gunakan Request biasa
  const { otherUsername } = req.query; // Username pengguna lain
  const userId = req.user?._id; // Sekarang req.user memiliki tipe IUser | undefined

  if (!userId) {
    return res.status(401).json({ message: 'Pengirim tidak terotentikasi.' });
  }
  if (!otherUsername) {
    return res.status(400).json({ message: 'Nama pengguna lawan bicara diperlukan.' });
  }

  try {
    const otherUser = await User.findOne({ username: otherUsername });
    if (!otherUser) {
      return res.status(404).json({ message: 'Pengguna lawan bicara tidak ditemukan.' });
    }

    const otherUserId = otherUser._id;

    // Dapatkan pesan di mana pengguna saat ini adalah pengirim DAN penerima adalah pengguna lain
    // ATAU pengguna lain adalah pengirim DAN pengguna saat ini adalah penerima
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ timestamp: 1 }) // Urutkan berdasarkan waktu
      .populate('sender', 'username') // Isi detail pengirim (hanya username)
      .populate('receiver', 'username'); // Isi detail penerima (hanya username)

    res.status(200).json(messages);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan pesan:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan pesan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan pesan: An unknown error occurred.' });
    }
  }
};

// Update (U) - Mengupdate pesan (opsional, karena pesan chat biasanya tidak diupdate)
export const updateMessage = async (req: Request, res: Response) => { // Gunakan Request biasa
  const { id } = req.params; // ID pesan
  const { content } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }
  if (!content) {
    return res.status(400).json({ message: 'Konten pesan diperlukan untuk pembaruan.' });
  }

  try {
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

    // Pastikan hanya pengirim yang bisa mengupdate pesannya
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Anda tidak diizinkan untuk mengupdate pesan ini.' });
    }

    message.content = content;
    await message.save();
    res.status(200).json(message);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mengupdate pesan:', err);
      res.status(500).json({ message: 'Kesalahan server saat mengupdate pesan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mengupdate pesan: An unknown error occurred.' });
    }
  }
};

// Delete (D) - Menghapus pesan
export const deleteMessage = async (req: Request, res: Response) => { // Gunakan Request biasa
  const { id } = req.params; // ID pesan
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

    // Pastikan hanya pengirim yang bisa menghapus pesannya
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Anda tidak diizinkan untuk menghapus pesan ini.' });
    }

    await message.deleteOne(); // Menggunakan deleteOne() untuk menghapus dokumen
    res.status(200).json({ message: 'Pesan berhasil dihapus.' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan menghapus pesan:', err);
      res.status(500).json({ message: 'Kesalahan server saat menghapus pesan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat menghapus pesan: An unknown error occurred.' });
    }
  }
};
