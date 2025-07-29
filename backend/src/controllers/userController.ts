import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Friendship, { IFriendship } from '../models/Friendship';
import { Types } from 'mongoose';

// Untuk mendapatkan ID pengguna dari request setelah otentikasi
interface AuthenticatedRequest extends Request {
  user?: IUser; // Properti user ditambahkan oleh middleware basicAuth
}

// Mencari pengguna berdasarkan username
export const searchUsers = async (req: Request, res: Response) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: 'Username diperlukan untuk pencarian.' });
  }

  try {
    const users = await User.find({
      username: { $regex: username, $options: 'i' } // Pencarian case-insensitive
    }).select('username _id'); // Hanya kembalikan username dan ID

    res.status(200).json(users);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mencari pengguna:', err);
      res.status(500).json({ message: 'Kesalahan server saat mencari pengguna: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mencari pengguna: An unknown error occurred.' });
    }
  }
};

// Mengirim permintaan pertemanan
export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { recipientUsername } = req.body;
  const requesterId = req.user?._id;

  if (!requesterId) {
    return res.status(401).json({ message: 'Pengirim tidak terotentikasi.' });
  }
  if (!recipientUsername) {
    return res.status(400).json({ message: 'Nama pengguna penerima diperlukan.' });
  }

  try {
    const recipientUser = await User.findOne({ username: recipientUsername });
    if (!recipientUser) {
      return res.status(404).json({ message: 'Pengguna penerima tidak ditemukan.' });
    }

    if (requesterId.equals(recipientUser._id as Types.ObjectId)) {
      return res.status(400).json({ message: 'Tidak bisa mengirim permintaan pertemanan ke diri sendiri.' });
    }

    // Cek apakah permintaan sudah ada (pending, accepted, atau rejected)
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        return res.status(409).json({ message: 'Permintaan pertemanan sudah dikirim atau diterima.' });
      } else if (existingFriendship.status === 'accepted') {
        return res.status(409).json({ message: 'Anda sudah berteman dengan pengguna ini.' });
      } else if (existingFriendship.status === 'rejected') {
        return res.status(409).json({ message: 'Permintaan pertemanan sebelumnya telah ditolak.' });
      }
    }

    const newFriendship: IFriendship = new Friendship({
      requester: requesterId,
      recipient: recipientUser._id,
      status: 'pending',
    });

    await newFriendship.save();
    res.status(201).json({ message: 'Permintaan pertemanan berhasil dikirim.', friendship: newFriendship });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mengirim permintaan pertemanan:', err);
      res.status(500).json({ message: 'Kesalahan server saat mengirim permintaan pertemanan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mengirim permintaan pertemanan: An unknown error occurred.' });
    }
  }
};

// Menerima permintaan pertemanan
export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { friendshipId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ message: 'Permintaan pertemanan tidak ditemukan.' });
    }

    if (!friendship.recipient.equals(userId as Types.ObjectId)) {
      return res.status(403).json({ message: 'Anda tidak diizinkan untuk menerima permintaan ini.' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ message: 'Permintaan pertemanan tidak dalam status pending.' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    // Tambahkan kedua pengguna ke daftar teman masing-masing
    await User.findByIdAndUpdate(friendship.requester, { $addToSet: { friends: friendship.recipient } });
    await User.findByIdAndUpdate(friendship.recipient, { $addToSet: { friends: friendship.requester } });

    res.status(200).json({ message: 'Permintaan pertemanan diterima.', friendship });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan menerima permintaan pertemanan:', err);
      res.status(500).json({ message: 'Kesalahan server saat menerima permintaan pertemanan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat menerima permintaan pertemanan: An unknown error occurred.' });
    }
  }
};

// Menolak permintaan pertemanan
export const rejectFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { friendshipId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ message: 'Permintaan pertemanan tidak ditemukan.' });
    }

    if (!friendship.recipient.equals(userId as Types.ObjectId)) {
      return res.status(403).json({ message: 'Anda tidak diizinkan untuk menolak permintaan ini.' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ message: 'Permintaan pertemanan tidak dalam status pending.' });
    }

    friendship.status = 'rejected';
    await friendship.save();

    res.status(200).json({ message: 'Permintaan pertemanan ditolak.', friendship });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan menolak permintaan pertemanan:', err);
      res.status(500).json({ message: 'Kesalahan server saat menolak permintaan pertemanan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat menolak permintaan pertemanan: An unknown error occurred.' });
    }
  }
};

// Mendapatkan daftar teman
export const getFriends = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const user = await User.findById(userId).populate('friends', 'username');
    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    res.status(200).json(user.friends);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan daftar teman:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan daftar teman: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan daftar teman: An unknown error occurred.' });
    }
  }
};

// Mendapatkan permintaan pertemanan yang masuk dan keluar
export const getPendingFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const incomingRequests = await Friendship.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'username');

    const outgoingRequests = await Friendship.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'username');

    res.status(200).json({ incoming: incomingRequests, outgoing: outgoingRequests });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan permintaan pertemanan pending:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan permintaan pertemanan pending: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan permintaan pertemanan pending: An unknown error occurred.' });
    }
  }
};

// Mendapatkan saran pengguna (teman dari teman atau pengguna lain)
export const getSuggestions = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const currentUser = await User.findById(userId).populate('friends', '_id'); // Hanya perlu ID teman

    if (!currentUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    const friendIds = currentUser.friends.map(friend => friend._id);
    friendIds.push(userId as Types.ObjectId); // Tambahkan ID pengguna saat ini untuk mengecualikan diri sendiri

    let suggestedUsers: IUser[] = [];

    if (currentUser.friends.length > 0) { // Jika pengguna memiliki teman
      // Temukan teman dari teman
      const friendsOfFriends = await User.find({
        _id: { $nin: friendIds }, // Kecualikan diri sendiri dan teman langsung
        friends: { $in: currentUser.friends.map(f => f._id) } // Teman yang memiliki teman dari pengguna saat ini
      }).select('username _id');

      // Hitung teman bersama dan prioritaskan
      const suggestedWithMutualCount = [];
      for (const fof of friendsOfFriends) {
        const fofFriends = await User.findById(fof._id).select('friends');
        if (fofFriends) {
          const commonFriends = fofFriends.friends.filter(fofFriendId =>
            currentUser.friends.some(friendId => friendId._id.equals(fofFriendId))
          );
          suggestedWithMutualCount.push({ user: fof, mutualCount: commonFriends.length });
        }
      }

      // Urutkan berdasarkan jumlah teman bersama (tertinggi di atas)
      suggestedWithMutualCount.sort((a, b) => b.mutualCount - a.mutualCount);
      suggestedUsers = suggestedWithMutualCount.map(item => item.user);

      // Jika saran masih kurang, tambahkan pengguna lain
      if (suggestedUsers.length < 10) { // Targetkan hingga 10 saran
        const existingUserIds = new Set([...friendIds.map(id => id.toString()), ...suggestedUsers.map(u => u._id.toString())]);
        const otherUsers = await User.find({
          _id: { $nin: Array.from(existingUserIds) } // Kecualikan yang sudah ada
        }).select('username _id').limit(10 - suggestedUsers.length);
        suggestedUsers = [...suggestedUsers, ...otherUsers];
      }

    } else { // Jika pengguna belum punya teman, tampilkan pengguna lain
      suggestedUsers = await User.find({
        _id: { $ne: userId } // Kecualikan diri sendiri
      }).select('username _id').limit(10); // Batasi jumlah saran umum
    }

    // Filter pengguna yang sudah memiliki permintaan pertemanan pending (keluar atau masuk)
    const pendingFriendships = await Friendship.find({
        $or: [
            { requester: userId },
            { recipient: userId }
        ],
        status: 'pending'
    }).select('requester recipient');

    const pendingUserIds = new Set<string>();
    pendingFriendships.forEach(fs => {
        pendingUserIds.add(fs.requester.toString());
        pendingUserIds.add(fs.recipient.toString());
    });

    const finalSuggestions = suggestedUsers.filter(user => !pendingUserIds.has(user._id.toString()));

    res.status(200).json(finalSuggestions);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan saran pengguna:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan saran pengguna: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan saran pengguna: An unknown error occurred.' });
    }
  }
};