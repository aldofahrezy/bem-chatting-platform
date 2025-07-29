import { Request, Response } from 'express';
import Message, { IMessage } from '../models/Message';
import User, { IUser } from '../models/User';
import Friendship, { IFriendship } from '../models/Friendship';

// For getting the user ID from the request after authentication
interface AuthenticatedRequest extends Request {
  user?: IUser; // 'user' property added by basicAuth middleware
}

// Create (C) - Send a new message
export const createMessage = async (req: AuthenticatedRequest, res: Response) => {
  const { receiverUsername, content } = req.body;
  const senderId = req.user?._id;

  if (!senderId) {
    return res.status(401).json({ message: 'Pengirim tidak terotentikasi.' });
  }
  if (!receiverUsername || !content) {
    return res.status(400).json({ message: 'Nama pengguna penerima dan konten pesan diperlukan.' });
  }

  try {
    const recipientUser = await User.findOne({ username: receiverUsername });
    if (!recipientUser) {
      return res.status(404).json({ message: 'Pengguna penerima tidak ditemukan.' });
    }

    // Check if they are already friends (status 'accepted')
    let friendship = await Friendship.findOne({
      $or: [
        { requester: senderId, recipient: recipientUser._id },
        { requester: recipientUser._id, recipient: senderId }
      ],
      status: 'accepted'
    });

    let messageStatus: 'normal' | 'request' = 'normal';

    if (!friendship) { // If they are not yet friends
      // Scenario 1: Recipient replies to a message request (automatically accept friendship)
      // Find a pending friend request sent by the RECIPIENT (as requester) to the SENDER (as recipient)
      const pendingIncomingFriendship = await Friendship.findOne({
        requester: recipientUser._id,
        recipient: senderId,
        status: 'pending'
      });

      if (pendingIncomingFriendship) {
        // Automatically accept the friend request
        pendingIncomingFriendship.status = 'accepted';
        await pendingIncomingFriendship.save();

        // Add both users to each other's friend lists
        await User.findByIdAndUpdate(pendingIncomingFriendship.requester, { $addToSet: { friends: pendingIncomingFriendship.recipient } });
        await User.findByIdAndUpdate(pendingIncomingFriendship.recipient, { $addToSet: { friends: pendingIncomingFriendship.requester } });

        // Change the status of previous message requests from the original sender (now recipient) to normal
        await Message.updateMany(
          { sender: recipientUser._id, receiver: senderId, status: 'request' },
          { $set: { status: 'normal' } }
        );

        friendship = pendingIncomingFriendship;
        messageStatus = 'normal'; 
      } else {
        // Scenario 2: Current sender sends the first message to a non-friend (new message request)
        // Check if there's an existing pending outgoing request from the current sender to the recipient
        const existingOutgoingPending = await Friendship.findOne({
            requester: senderId,
            recipient: recipientUser._id,
            status: 'pending'
        });

        // Check if there's an existing pending incoming request from the recipient to the current sender
        const existingIncomingPending = await Friendship.findOne({
            requester: recipientUser._id,
            recipient: senderId,
            status: 'pending'
        });

        if (existingOutgoingPending || existingIncomingPending) {
            messageStatus = 'request';
        } else {
            // This is the first message to a non-friend, create a new friend request
            const newFriendshipRequest: IFriendship = new Friendship({
                requester: senderId,
                recipient: recipientUser._id,
                status: 'pending',
            });
            await newFriendshipRequest.save();
            messageStatus = 'request';
        }
      }
    } else {
      // Already friends, message will be normal
    }

    const newMessage: IMessage = new Message({
      sender: senderId,
      receiver: recipientUser._id,
      content: content,
      status: messageStatus
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

// Read (R) - Get messages between two users (Friends only)
export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  const { otherUsername } = req.query;
  const userId = req.user?._id;

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

    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: otherUserId, status: 'accepted' },
        { requester: otherUserId, recipient: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(403).json({ message: 'Anda hanya dapat melihat pesan normal dengan teman.' });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
      status: 'normal'
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'username')
      .populate('receiver', 'username');

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

// Get all conversation history (normal and request) between two users
export const getConversationHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { otherUsername } = req.query;
  const userId = req.user?._id;

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

    // Retrieve all messages (normal and request) between two users
    // AND filter out messages that are marked as 'deletedFor' the current userId
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
      // Add this condition to filter out messages deleted for the current user
      deletedFor: { $nin: [userId] } // $nin ensures userId is NOT in the deletedFor array
    })
      .sort({ timestamp: 1 })
      .populate('sender', 'username')
      .populate('receiver', 'username');

    res.status(200).json(messages);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan riwayat percakapan:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan riwayat percakapan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan riwayat percakapan: An unknown error occurred.' });
    }
  }
};

// Get message requests (from non-friends) received by the current user
export const getMessageRequests = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const messageRequests = await Message.find({
      receiver: userId,
      status: 'request'
    })
      .sort({ timestamp: -1 })
      .populate('sender', 'username'); // Populate the sender to get username

    // Filter out messages where sender is null (if populate failed)
    const filteredMessageRequests = messageRequests.filter(msg => msg.sender !== null);

    res.status(200).json(filteredMessageRequests);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan mendapatkan pesan permintaan:', err);
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan pesan permintaan: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat mendapatkan pesan permintaan: An unknown error occurred.' });
    }
  }
};

// Update (U) - Update a message (optional, as chat messages are usually not updated)
export const updateMessage = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
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

    if (message.sender.toString() !== userId!.toString()) {
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

// Delete (D) - Delete a message
export const deleteMessage = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

    if (message.sender.toString() !== userId!.toString()) {
      return res.status(403).json({ message: 'Anda tidak diizinkan untuk menghapus pesan ini.' });
    }

    await message.deleteOne();
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

export const deleteMessageForMe = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Pengguna tidak terotentikasi.' });
  }

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

    // Pastikan pesan ini dikirim oleh pengguna yang meminta penghapusan
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Anda tidak diizinkan menghapus pesan ini untuk Anda.' });
    }

    // Tambahkan ID pengguna ke array deletedFor
    // $addToSet memastikan ID hanya ditambahkan sekali
    await Message.findByIdAndUpdate(id, { $addToSet: { deletedFor: userId } });

    res.status(200).json({ message: 'Pesan berhasil dihapus untuk Anda.' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Kesalahan menghapus pesan untuk saya:', err);
      res.status(500).json({ message: 'Kesalahan server saat menghapus pesan untuk saya: ' + err.message });
    } else {
      res.status(500).json({ message: 'Kesalahan server saat menghapus pesan untuk saya: An unknown error occurred.' });
    }
  }
};