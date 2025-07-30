"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Search, Phone, Video, MoreHorizontal, Send, Users, Bell, UserPlus, Check, X, Edit, Edit2 } from "lucide-react"
import { useAuth } from '@/context/AuthContext';
import AlertDialog from '@/components/AlertDialog';
import toast from 'react-hot-toast';
import { BASE_API_URL } from '@/utils/constants';

// Komponen untuk menampilkan satu pesan
interface MessageProps {
  _id: string
  sender: { _id: string; username: string }
  receiver: { _id: string; username: string }
  content: string
  timestamp: string
  status?: 'normal' | 'request';
  isEdited?: boolean;
}

// Perbarui prop untuk komponen Message agar menerima dua handler hapus yang berbeda
const Message: React.FC<{
  msg: MessageProps;
  currentUserId: string;
  onDeleteForMe: (messageId: string) => void;
  onUnsend: (messageId: string) => void;
  onEdit: (message: MessageProps) => void;
}> = ({ msg, currentUserId, onDeleteForMe, onUnsend, onEdit }) => {
  const isMe = msg.sender._id === currentUserId
  const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const [showMenu, setShowMenu] = useState(false); // State untuk menampilkan/menyembunyikan menu opsi pesan
  const menuRef = useRef<HTMLDivElement>(null); // Ref untuk mendeteksi klik di luar menu

  // Tutup menu saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4 group`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm relative ${
          isMe
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
            : "bg-white text-gray-800 border border-gray-100"
        }`}
      >
        <p className="text-sm">{msg.content}</p>
        <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-400"}`}>
          {formattedTime}
          {msg.isEdited && <span className="ml-2 opacity-80">(Diedit)</span>}
        </p>
        {isMe && (
          // Pembungkus untuk tombol menu dan dropdown
          <div ref={menuRef} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="bg-gray-700 text-white rounded-full p-1 hover:bg-gray-600"
              title="Opsi Pesan"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg overflow-hidden">
                <button
                  onClick={() => { onEdit(msg); setShowMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="inline-block mr-2 size-auto" />
                  Edit
                </button>
                <button
                  onClick={() => { onDeleteForMe(msg._id); setShowMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Hapus untuk saya
                </button>
                <button
                  onClick={() => { onUnsend(msg._id); setShowMenu(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Batalkan pengiriman
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Antarmuka untuk data pengguna dari backend (teman, hasil pencarian)
interface UserData {
  _id: string;
  username: string;
}

// Antarmuka untuk teman dengan pesan terakhir
interface FriendWithLastMessage extends UserData {
  lastMessageContent?: string;
  lastMessageTimestamp?: string;
}

// Antarmuka untuk permintaan pertemanan
interface FriendshipRequest {
  _id: string;
  requester: UserData;
  recipient: UserData;
  status: 'pending' | 'accepted' | 'rejected';
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [newMessageContent, setNewMessageContent] = useState<string>("")
  const [selectedChatUser, setSelectedChatUser] = useState<UserData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Gunakan useAuth hook untuk mendapatkan status login
  const { isLoggedIn, username: currentUsername, logout } = useAuth();
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  // State baru untuk data dari backend
  const [friends, setFriends] = useState<FriendWithLastMessage[]>([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendshipRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendshipRequest[]>([]);
  const [usersFoundBySearch, setUsersFoundBySearch] = useState<UserData[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageProps[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserData[]>([]);

  // State mengedit pesan
  const [editingMessage, setEditingMessage] = useState<MessageProps | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // State untuk manajemen UI sidebar
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chats' | 'requests' | 'search'>('chats');

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // State untuk alert dialog
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Batal',
    isConfirmDestructive: false,
    onConfirm: () => {}, // Placeholder, akan diisi saat dialog dibuka
  });

  // Fungsi untuk mendapatkan kredensial Basic Auth dari LocalStorage
  const getAuthHeader = useCallback(() => {
    if (typeof window !== "undefined") {
      const credentials = localStorage.getItem("basicAuthCredentials")
      return credentials ? `Basic ${credentials}` : ""
    }
    return ""
  }, []);

  // Fungsi untuk mengambil daftar teman dan pesan terakhir mereka
  const fetchFriends = useCallback(async () => {
    if (!currentUserId || !isLoggedIn) return; // Pastikan currentUserId dan isLoggedIn ada
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/friends`, {
        headers: { Authorization: authHeader }
      });
      
      if (response.ok) {
        const friendList: UserData[] = await response.json();
        const friendsWithMessages: FriendWithLastMessage[] = await Promise.all(
          friendList.map(async (friend) => {
            try {
              const msgResponse = await fetch(`${BASE_API_URL}/api/messages/history?otherUsername=${friend.username}`, {
                headers: { Authorization: authHeader }
              });
              const msgs: MessageProps[] = await msgResponse.json();
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
              return {
                ...friend,
                lastMessageContent: lastMsg?.content,
                lastMessageTimestamp: lastMsg?.timestamp,
              };
            } catch (error: unknown) {
              console.error(`Gagal memuat pesan terakhir untuk ${friend.username}:`, error);
              return { ...friend, lastMessageContent: undefined, lastMessageTimestamp: undefined };
            }
          })
        );
        setFriends(friendsWithMessages);
      } else {
        const errorData = await response.json();
        if (typeof errorData === 'object' && errorData !== null && 'message' in errorData) {
          console.error('Gagal memuat teman:', (errorData as { message: string }).message);
        } else {
          console.error('Gagal memuat teman: Unknown error format', errorData);
        }
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat memuat teman:', error);
    }
  }, [currentUserId, isLoggedIn, getAuthHeader]);

  // Fungsi untuk mengambil permintaan pertemanan
  const fetchFriendRequests = useCallback(async () => {
    if (!currentUserId || !isLoggedIn) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/friend-requests/pending`, {
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        setIncomingFriendRequests(data.incoming);
        setOutgoingFriendRequests(data.outgoing);
      } else {
        if (typeof data === 'object' && data !== null && 'message' in data) {
          console.error('Gagal memuat permintaan pertemanan:', (data as { message: string }).message);
        } else {
          console.error('Gagal memuat permintaan pertemanan: Unknown error format', data);
        }
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat memuat permintaan pertemanan:', error);
    }
  }, [currentUserId, isLoggedIn, getAuthHeader]);

  // Fungsi untuk mengambil pesan permintaan
  const fetchMessageRequests = useCallback(async () => {
    if (!currentUserId || !isLoggedIn) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/messages/requests`, {
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        setMessageRequests(data);
      } else {
        if (typeof data === 'object' && data !== null && 'message' in data) {
          console.error('Gagal memuat pesan permintaan:', (data as { message: string }).message);
        } else {
          console.error('Gagal memuat pesan permintaan: Unknown error format', data);
        }
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat memuat pesan permintaan:', error);
    }
  }, [currentUserId, isLoggedIn, getAuthHeader]);

  // Fungsi untuk mengambil saran pengguna
  const fetchSuggestedUsers = useCallback(async () => {
    if (!currentUserId || !isLoggedIn) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/suggestions`, {
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestedUsers(data);
      } else {
        if (typeof data === 'object' && data !== null && 'message' in data) {
          console.error('Gagal memuat saran pengguna:', (data as { message: string }).message);
        } else {
          console.error('Gagal memuat saran pengguna: Unknown error format', data);
        }
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat memuat saran pengguna:', error);
    }
  }, [currentUserId, isLoggedIn, getAuthHeader]);


  // Efek untuk memuat data awal (teman, permintaan, pesan permintaan, saran)
  useEffect(() => {
    if (currentUserId && isLoggedIn) {
      fetchFriends();
      fetchFriendRequests();
      fetchMessageRequests();
      fetchSuggestedUsers();
    }
  }, [currentUserId, isLoggedIn, fetchFriends, fetchFriendRequests, fetchMessageRequests, fetchSuggestedUsers]); // Tambah isLoggedIn ke dependensi

  const handleEditMessage = useCallback((message: MessageProps) => {
    setEditingMessage(message);
    setNewMessageContent(message.content); // Pre-fill the input with message content
    messageInputRef.current?.focus(); // Focus the input field
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setNewMessageContent(''); // Clear the input
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && editingMessage) {
        handleCancelEdit();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingMessage, handleCancelEdit]);

  // Efek untuk memuat pesan ketika selectedChatUser berubah
  const fetchConversationHistory = useCallback(async () => {
    if (!currentUserId || !selectedChatUser || !isLoggedIn) {
      setMessages([]);
      return;
    }
    setError(null);
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/messages/history?otherUsername=${selectedChatUser.username}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      } else {
        setError(data.message || "Gagal memuat riwayat percakapan.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Kesalahan memuat riwayat percakapan:", error);
        setError("Terjadi kesalahan jaringan atau server saat memuat riwayat percakapan: " + error.message);
      } else {
        setError("Terjadi kesalahan jaringan atau server saat memuat riwayat percakapan: An unknown error occurred.");
      }
    }
  }, [currentUserId, selectedChatUser, isLoggedIn, getAuthHeader]);

  useEffect(() => {
    if (currentUserId && selectedChatUser && isLoggedIn) {
      fetchConversationHistory();
    }
  }, [currentUserId, selectedChatUser, isLoggedIn, fetchConversationHistory]);


  // Efek untuk menggulir ke bawah setiap kali pesan berubah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handler untuk "Delete for me"
  const handleDeleteForMe = useCallback(async (messageId: string) => {
    setAlertDialogContent({
      title: 'Hapus Pesan',
      message: 'Apakah Anda yakin ingin menghapus pesan ini hanya untuk Anda? Pesan ini akan hilang dari riwayat chat Anda.',
      confirmText: 'Hapus untuk saya',
      cancelText: 'Batal',
      isConfirmDestructive: true,
      onConfirm: async () => {
        try {
          const authHeader = getAuthHeader();
          const response = await fetch(`${BASE_API_URL}/api/messages/${messageId}/delete-for-me`, {
            method: 'PUT',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
          });

          if (response.ok) {
            setMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));
            fetchFriends();
            fetchMessageRequests();
            fetchSuggestedUsers();
            toast.success('Pesan berhasil dihapus untuk Anda.');
          } else {
            const errorData = await response.json();
            toast.error(errorData.message || 'Gagal menghapus pesan untuk Anda.'); // Fallback to toast for errors
          }
        } catch (error: unknown) {
          console.error("Kesalahan menghapus pesan untuk saya:", error);
          toast.error('Terjadi kesalahan jaringan saat menghapus pesan untuk Anda.'); // Fallback to toast for errors
        }
      },
    });
    setIsAlertDialogOpen(true);
  }, [fetchFriends, fetchMessageRequests, fetchSuggestedUsers, getAuthHeader]);

  // Handler untuk "Unsend message" (menghapus dari database untuk semua)
  const handleUnsendMessage = async (messageId: string) => {
    if (!currentUserId) {
      toast.error("Anda belum login.");
      return;
    }
    setAlertDialogContent({
      title: 'Batalkan Pengiriman Pesan',
      message: 'Apakah Anda yakin ingin membatalkan pengiriman pesan ini? Pesan ini akan dihapus untuk Anda dan penerima.',
      confirmText: 'Batalkan Kirim',
      cancelText: 'Batal',
      isConfirmDestructive: true,
      onConfirm: async () => { // Aksi konfirmasi akan dieksekusi di sini
        try {
          const authHeader = getAuthHeader();
          const response = await fetch(`${BASE_API_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': authHeader,
            },
          });

          if (response.ok) {
            toast.success('Pengiriman pesan berhasil dibatalkan.');
            setMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId)); // Atau tandai sebagai 'dibatalkan'
            fetchFriends();
            fetchFriendRequests();
            fetchMessageRequests();
            fetchSuggestedUsers();
            fetchConversationHistory();
          } else {
            const errorData = await response.json();
            toast.error(errorData.message || 'Gagal membatalkan pengiriman pesan.'); // Fallback to toast for errors
          }
        } catch (error: unknown) {
          console.error("Kesalahan membatalkan pengiriman pesan:", error);
          toast.error('Terjadi kesalahan jaringan saat membatalkan pengiriman pesan.'); // Fallback to toast for errors
        }
      },
    });
    setIsAlertDialogOpen(true);
  };


  // Handler untuk mengirim pesan
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !selectedChatUser) {
      setError("Pesan atau pengguna yang dipilih tidak boleh kosong.");
      return;
    }
    if (!currentUserId) {
      setError("Anda belum login.");
      return;
    }
    setError(null);

    const authHeader = getAuthHeader();

    if (editingMessage) {
      // Logic for editing an existing message
      try {
        const response = await fetch(`${BASE_API_URL}/api/messages/${editingMessage._id}`, {
          method: "PUT", // Use PUT for updating
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ content: newMessageContent }),
        });
        const data = await response.json();
        if (response.ok) {
          setNewMessageContent("");
          setEditingMessage(null); // Exit edit mode
          // Optimistically update the message in the UI
          setMessages(prevMessages =>
            prevMessages.map(msg =>
              msg._id === data._id ? { ...msg, content: data.content, isEdited: true } : msg // <--- Set isEdited to true
            )
          );
          // Re-fetch to ensure full consistency and update last message in sidebar if applicable
          setTimeout(() => {
            fetchConversationHistory();
            fetchFriends(); // Update sidebar if last message was edited
          }, 200);
        } else {
          setError(data.message || "Gagal mengupdate pesan.");
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Kesalahan mengupdate pesan:", error);
          setError("Terjadi kesalahan jaringan atau server saat mengupdate pesan: " + error.message);
        } else {
          setError("Terjadi kesalahan jaringan atau server saat mengupdate pesan: An unknown error occurred.");
        }
      }
    } else {
      // Original logic for sending a new message
      const isFriend = friends.some(f => f._id === selectedChatUser._id);
      const hasOutgoingRequest = outgoingFriendRequests.some(req => req.recipient._id === selectedChatUser._id);
      const hasIncomingRequest = incomingFriendRequests.some(req => req.requester?._id === selectedChatUser._id);

      if (!isFriend && !hasOutgoingRequest && !hasIncomingRequest) {
          const confirmSendRequest = window.confirm(
              `Anda akan mengirim pesan kepada ${selectedChatUser.username}, yang bukan teman Anda. ` +
              `Mengirim pesan ini juga akan mengirimkan permintaan pertemanan. Lanjutkan?`
          );
          if (!confirmSendRequest) {
              return;
          }
      }

      try {
        const response = await fetch(`${BASE_API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ receiverUsername: selectedChatUser.username, content: newMessageContent }),
        });
        const data = await response.json();
        if (response.ok) {
          setNewMessageContent("");
          const tempMessage: MessageProps = {
            _id: data._id || `temp-${Date.now()}`,
            sender: { _id: currentUserId!, username: currentUsername! },
            receiver: { _id: selectedChatUser._id, username: selectedChatUser.username },
            content: newMessageContent,
            timestamp: new Date().toISOString(),
            status: data.status || 'normal',
            isEdited: false // New messages are not edited
          };
          setMessages(prevMessages => [...prevMessages, tempMessage]);

          fetchFriends();
          fetchFriendRequests();
          fetchMessageRequests();
          fetchSuggestedUsers();

          setTimeout(() => {
            fetchConversationHistory();
          }, 500);

        } else {
          setError(data.message || "Gagal mengirim pesan.");
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Kesalahan mengirim pesan:", error);
          setError("Terjadi kesalahan jaringan atau server saat mengirim pesan: " + error.message);
        } else {
          setError("Terjadi kesalahan jaringan atau server saat mengirim pesan: An unknown error occurred.");
        }
      }
    }
  };

  // Handler untuk memilih kontak (teman, permintaan, atau hasil pencarian)
  const handleChatSelect = (user: UserData, chatType: 'friends' | 'messageRequests' | 'searchResult') => {
    if (!selectedChatUser || selectedChatUser._id !== user._id) {
        setMessages([]);
    }
    setSelectedChatUser(user);
    
    if (chatType === 'friends') {
      setActiveTab('chats');
    } else if (chatType === 'messageRequests') {
      setActiveTab('requests');
    } else if (chatType === 'searchResult') {
      setActiveTab('search');
    }

    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  };

  // Handler untuk mencari pengguna
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) {
      try {
        const authHeader = getAuthHeader();
        const response = await fetch(`${BASE_API_URL}/api/users/search?username=${term}`, {
          headers: { Authorization: authHeader }
        });
        const data = await response.json();
        if (response.ok) {
          setUsersFoundBySearch(data);
          setActiveTab('search');
        } else {
          if (typeof data === 'object' && data !== null && 'message' in data) {
            console.error('Gagal mencari pengguna:', (data as { message: string }).message);
          } else {
            console.error('Gagal mencari pengguna: Unknown error format', data);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Kesalahan jaringan saat mencari pengguna:', error);
        }
        setUsersFoundBySearch([]);
      }
    } else {
      setUsersFoundBySearch([]);
      if (activeTab === 'search') {
        setActiveTab('chats');
      }
    }
  };

  // Handler untuk mengirim permintaan pertemanan
  const handleSendFriendRequest = async (recipientUsername: string) => {
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ recipientUsername })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Permintaan pertemanan berhasil dikirim.');
        fetchFriendRequests();
        fetchSuggestedUsers();
      } else {
        toast.error(data.message || 'Gagal mengirim permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat mengirim permintaan pertemanan:', error);
      toast.error('Terjadi kesalahan jaringan saat mengirim permintaan pertemanan.');
    }
  };

  // Handler untuk menerima permintaan pertemanan
  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/friend-request/${friendshipId}/accept`, {
        method: 'PUT',
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Permintaan pertemanan diterima.');
        fetchFriendRequests();
        fetchFriends();
        fetchSuggestedUsers();
        fetchMessageRequests();
        // Setelah menerima permintaan, muat ulang riwayat percakapan dengan pengguna ini
        // Jika pengguna yang diterima adalah selectedChatUser, maka fetch ulang chat history
        const acceptedFriendship = incomingFriendRequests.find(req => req._id === friendshipId);
        if (selectedChatUser && acceptedFriendship && selectedChatUser._id === acceptedFriendship.requester._id) {
          fetchConversationHistory();
        }
      } else {
        toast.error(data.message || 'Gagal menerima permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat menerima permintaan pertemanan:', error);
      toast.error('Terjadi kesalahan jaringan saat menerima permintaan pertemanan.');
    }
  };

  // Handler untuk menolak permintaan pertemanan
  const handleRejectFriendRequest = async (friendshipId: string) => {
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`${BASE_API_URL}/api/users/friend-request/${friendshipId}/reject`, {
        method: 'PUT',
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Permintaan pertemanan berhasil ditolak.');
        fetchFriendRequests();
        fetchSuggestedUsers();
      } else {
        toast.error(data.message || 'Gagal menolak permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat menolak permintaan pertemanan:', error);
      toast.error('Terjadi kesalahan jaringan saat menolak permintaan pertemanan.');
    }
  };


  // Perubahan pada kondisi loading/redirect
  if (!isLoggedIn || !currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <p className="text-xl text-blue-600 font-semibold">Logging out...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto h-screen flex gap-4">
        {/* Left Sidebar - Contacts, Search, Requests */}
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">BEM Chatting</h1>
              <Link href="/" className="text-blue-600 hover:text-blue-700 transition-colors">
                <span className="text-sm font-medium">← Beranda</span>
              </Link>
            </div>
            <p className="text-sm text-gray-500">Halo, {currentUsername}!</p>
          </div>

          {/* Navigation Icons */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <Phone className="w-5 h-5 text-gray-400" />
              <Video className="w-5 h-5 text-gray-400" />
              <div className="ml-auto">
                <button onClick={logout} className="text-sm text-red-600 hover:text-red-700 font-medium"> {/* <--- Panggil logout dari AuthContext */}
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pengguna atau chat..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Tabs for Chats, Requests, Search Results */}
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'chats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
              }`}
              onClick={() => { setActiveTab('chats'); setSearchTerm(''); setUsersFoundBySearch([]); }}
            >
              Chats
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium relative ${
                activeTab === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
              }`}
              onClick={() => { setActiveTab('requests'); setSearchTerm(''); setUsersFoundBySearch([]); }}
            >
              Requests
              {(incomingFriendRequests.length > 0 || messageRequests.length > 0) && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {incomingFriendRequests.length + messageRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Dynamic Content based on Active Tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Teman ({friends.length})</h2>
                </div>
                <div className="space-y-2">
                  {friends.length === 0 && <p className="text-gray-500 text-sm">Belum ada teman. Cari dan tambahkan teman!</p>}
                  {friends.map((friend) => (
                    <div
                      key={friend._id}
                      onClick={() => handleChatSelect(friend, 'friends')}
                      className={`p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedChatUser?._id === friend._id ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-lg">
                            {friend.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div> {/* Online status mock */}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">{friend.username}</h3>
                          {/* Menampilkan pesan terakhir */}
                          {friend.lastMessageContent ? (
                            <p className="text-sm text-gray-500 truncate">
                              {friend.lastMessageContent}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 truncate">Belum ada pesan.</p>
                          )}
                        </div>
                        {friend.lastMessageTimestamp && (
                          <div className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(friend.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Permintaan Masuk ({incomingFriendRequests.length})</h2>
                <div className="space-y-3 mb-6">
                  {incomingFriendRequests.length === 0 && <p className="text-gray-500 text-sm">Tidak ada permintaan pertemanan masuk.</p>}
                  {incomingFriendRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm">
                          {req.requester.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium text-gray-800">{req.requester.username || 'Unknown User'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptFriendRequest(req._id)}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors"
                          title="Terima"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectFriendRequest(req._id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors"
                          title="Tolak"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="text-lg font-semibold text-gray-800 mb-4">Pesan Permintaan ({messageRequests.length})</h2>
                <div className="space-y-3">
                  {messageRequests.length === 0 && <p className="text-gray-500 text-sm">Tidak ada pesan permintaan baru.</p>}
                  {messageRequests.map((msgReq) => (
                    <div
                      key={msgReq._id}
                      onClick={() => handleChatSelect(msgReq.sender, 'messageRequests')}
                      className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                        {msgReq.sender.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{msgReq.sender.username || 'Unknown User'}</span> mengirim pesan permintaan: &quot;{msgReq.content}&quot;
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(msgReq.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="text-lg font-semibold text-gray-800 mb-4 mt-6">Permintaan Keluar ({outgoingFriendRequests.length})</h2>
                <div className="space-y-3">
                  {outgoingFriendRequests.length === 0 && <p className="text-gray-500 text-sm">Tidak ada permintaan pertemanan keluar.</p>}
                  {outgoingFriendRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm">
                          {req.recipient.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium text-gray-800">{req.recipient.username || 'Unknown User'}</span>
                      </div>
                      <span className="text-sm text-gray-500">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Hasil Pencarian ({usersFoundBySearch.length})</h2>
                <div className="space-y-3">
                  {usersFoundBySearch.length === 0 && searchTerm.length > 2 && <p className="text-gray-500 text-sm">Tidak ada pengguna ditemukan untuk pencarian ini.</p>}
                  {usersFoundBySearch.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleChatSelect(user, 'searchResult')}
                      className={`flex items-center p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedChatUser?._id === user._id ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 truncate">{user.username}</span>
                      </div>
                      {user._id !== currentUserId && !friends.some(f => f._id === user._id) && !outgoingFriendRequests.some(r => r.recipient._id === user._id) && !incomingFriendRequests.some(r => r.requester._id === user._id) ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user.username); }}
                          className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <UserPlus className="w-3 h-3" /> Tambah
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 ml-auto flex-shrink-0">
                          {user._id === currentUserId ? 'Anda' : (friends.some(f => f._id === user._id) ? 'Teman' : (outgoingFriendRequests.some(r => r.recipient._id === user._id) ? 'Pending' : (incomingFriendRequests.some(r => r.requester._id === user._id) ? 'Perlu Diterima' : '')))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {/* Chat Header */}
          {selectedChatUser ? (
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-lg">
                    {selectedChatUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">{selectedChatUser.username}</h2>
                    <p className="text-sm text-green-500">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-gray-400 cursor-pointer hover:text-blue-600" />
                  <Video className="w-5 h-5 text-gray-400 cursor-pointer hover:text-blue-600" />
                  <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-blue-600" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 border-b border-gray-100 bg-white">
              <h2 className="font-semibold text-gray-800">Pilih Obrolan</h2>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {/* Error handling for messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-center">{error}</p>
              </div>
            )}

            {!selectedChatUser ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Pilih kontak untuk memulai chat</h3>
                  <p className="text-gray-500">Pilih dari daftar teman atau hasil pencarian di sebelah kiri untuk memulai percakapan</p>
                </div>
              </div>
            ) : (
              <>
                {messages.length === 0 && !error && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Belum ada pesan dengan {selectedChatUser.username}</p>
                    <p className="text-sm text-gray-400 mt-1">Mulai percakapan dengan mengirim pesan pertama!</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <Message
                    key={msg._id}
                    msg={msg}
                    currentUserId={currentUserId!}
                    onDeleteForMe={handleDeleteForMe}
                    onUnsend={handleUnsendMessage}
                    onEdit={handleEditMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          {selectedChatUser && (
            <div className="p-6 border-t border-gray-100 bg-white">
              {editingMessage && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Mengedit Pesan</span>
                    <span className="text-sm text-gray-600 truncate max-w-[calc(100%-150px)]">
                      {editingMessage.content}
                    </span>
                  </div>
                  <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    placeholder={editingMessage ? "Edit pesan Anda..." : "Ketik pesan Anda di sini..."} // <--- Dynamic placeholder
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Sidebar - Notifications & Suggestions */}
        <div className="w-80 space-y-4 flex flex-col h-full">
          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Notifikasi</h2>
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {incomingFriendRequests.length === 0 && messageRequests.length === 0 && (
                <p className="text-gray-500 text-sm">Tidak ada notifikasi baru.</p>
              )}
              {incomingFriendRequests.map((req) => (
                <div key={req._id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                    {req.requester.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{req.requester.username || 'Unknown User'}</span> mengirim permintaan pertemanan.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAcceptFriendRequest(req._id)}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors"
                        title="Terima"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectFriendRequest(req._id)}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 transition-colors"
                        title="Tolak"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {messageRequests.map((msgReq) => (
                <div
                  key={msgReq._id}
                  onClick={() => handleChatSelect(msgReq.sender, 'messageRequests')}
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                    {msgReq.sender.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{msgReq.sender.username || 'Unknown User'}</span> mengirim pesan permintaan: &quot;{msgReq.content}&quot;
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(msgReq.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Saran Pengguna</h2>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {suggestedUsers.length === 0 ? ( // Selalu tampilkan pesan ini jika suggestedUsers kosong
                <p className="text-gray-500 text-sm">Tidak ada saran pengguna. Tambahkan teman untuk mendapatkan saran!</p>
              ) : ( // Jika ada suggestedUsers, tampilkan mereka
                suggestedUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleChatSelect(user, 'searchResult')}
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedChatUser?._id === user._id ? "bg-blue-50 border border-blue-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800 truncate">{user.username}</span>
                    </div>
                    {user._id !== currentUserId && !friends.some(f => f._id === user._id) && !outgoingFriendRequests.some(r => r.recipient._id === user._id) && !incomingFriendRequests.some(r => r.requester._id === user._id) ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user.username); }}
                        className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1 flex-shrink-0"
                      >
                        <UserPlus className="w-3 h-3" /> Tambah
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500 ml-auto flex-shrink-0">
                        {user._id === currentUserId ? 'Anda' : (friends.some(f => f._id === user._id) ? 'Teman' : (outgoingFriendRequests.some(r => r.recipient._id === user._id) ? 'Pending' : (incomingFriendRequests.some(r => r.requester._id === user._id) ? 'Perlu Diterima' : '')))}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {/* --- RENDER CUSTOM ALERT DIALOG --- */}
      <AlertDialog
        isOpen={isAlertDialogOpen}
        onClose={() => setIsAlertDialogOpen(false)}
        title={alertDialogContent.title}
        message={alertDialogContent.message}
        confirmText={alertDialogContent.confirmText}
        cancelText={alertDialogContent.cancelText}
        isConfirmDestructive={alertDialogContent.isConfirmDestructive}
        onConfirm={alertDialogContent.onConfirm}
      />
    </div>
  )
}