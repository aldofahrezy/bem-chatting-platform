"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Phone, Video, MoreHorizontal, Send, Users, Bell, UserPlus, Check, X, Trash2 } from "lucide-react"

// Komponen untuk menampilkan satu pesan
interface MessageProps {
  _id: string
  sender: { _id: string; username: string }
  receiver: { _id: string; username: string }
  content: string
  timestamp: string
  status?: 'normal' | 'request';
}

// Perbarui prop untuk komponen Message agar menerima dua handler hapus yang berbeda
const Message: React.FC<{
  msg: MessageProps;
  currentUserId: string;
  onDeleteForMe: (messageId: string) => void;
  onUnsend: (messageId: string) => void;
}> = ({ msg, currentUserId, onDeleteForMe, onUnsend }) => {
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
        <p className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-400"}`}>{formattedTime}</p>
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
  const router = useRouter()
  const [messages, setMessages] = useState<MessageProps[]>([])
  const [newMessageContent, setNewMessageContent] = useState<string>("")
  const [selectedChatUser, setSelectedChatUser] = useState<UserData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // State baru untuk data dari backend
  const [friends, setFriends] = useState<FriendWithLastMessage[]>([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendshipRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendshipRequest[]>([]);
  const [usersFoundBySearch, setUsersFoundBySearch] = useState<UserData[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageProps[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserData[]>([]);

  // State deletedMessagesLocal dihapus karena filtering di backend
  // const [deletedMessagesLocal, setDeletedMessagesLocal] = useState<string[]>([]);

  // State untuk manajemen UI sidebar
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chats' | 'requests' | 'search'>('chats'); // 'suggestions' tab dihapus dari sini

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fungsi untuk mendapatkan kredensial Basic Auth dari LocalStorage
  const getAuthHeader = useCallback(() => {
    if (typeof window !== "undefined") {
      const credentials = localStorage.getItem("basicAuthCredentials")
      return credentials ? `Basic ${credentials}` : ""
    }
    return ""
  }, []);

  // Efek untuk memeriksa status login dan memuat data pengguna
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId")
      const username = localStorage.getItem("username")
      if (!userId || !username) {
        router.push("/auth/login")
      } else {
        setCurrentUserId(userId)
        setCurrentUsername(username)
        setLoading(false);
      }
    }
  }, [router]);

  // Fungsi untuk mengambil daftar teman dan pesan terakhir mereka
  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch('http://localhost:5001/api/users/friends', {
        headers: { Authorization: authHeader }
      });
      
      if (response.ok) {
        const friendList: UserData[] = await response.json();
        // Untuk setiap teman, ambil pesan terakhir
        const friendsWithMessages: FriendWithLastMessage[] = await Promise.all(
          friendList.map(async (friend) => {
            try {
              const msgResponse = await fetch(`http://localhost:5001/api/messages/history?otherUsername=${friend.username}`, {
                headers: { Authorization: authHeader }
              });
              const msgs: MessageProps[] = await msgResponse.json();
              // Filter pesan yang dihapus secara lokal sudah dilakukan di backend
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
  }, [currentUserId, getAuthHeader]);

  // Fungsi untuk mengambil permintaan pertemanan
  const fetchFriendRequests = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch('http://localhost:5001/api/users/friend-requests/pending', {
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
  }, [currentUserId, getAuthHeader]);

  // Fungsi untuk mengambil pesan permintaan
  const fetchMessageRequests = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch('http://localhost:5001/api/messages/requests', {
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
  }, [currentUserId, getAuthHeader]);

  // Fungsi untuk mengambil saran pengguna
  const fetchSuggestedUsers = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const authHeader = getAuthHeader();
      const response = await fetch('http://localhost:5001/api/users/suggestions', {
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
  }, [currentUserId, getAuthHeader]);


  // Efek untuk memuat data awal (teman, permintaan, pesan permintaan, saran)
  useEffect(() => {
    if (currentUserId) {
      fetchFriends();
      fetchFriendRequests();
      fetchMessageRequests();
      fetchSuggestedUsers(); // Panggil fungsi baru
    }
  }, [currentUserId, fetchFriends, fetchFriendRequests, fetchMessageRequests, fetchSuggestedUsers]);


  // Efek untuk memuat pesan ketika selectedChatUser berubah
  const fetchConversationHistory = useCallback(async () => {
    if (!currentUserId || !selectedChatUser) {
      setMessages([]);
      return;
    }
    setError(null);
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`http://localhost:5001/api/messages/history?otherUsername=${selectedChatUser.username}`, {
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
  }, [currentUserId, selectedChatUser, getAuthHeader]);

  useEffect(() => {
    if (currentUserId && selectedChatUser) {
      fetchConversationHistory();
    }
  }, [currentUserId, selectedChatUser, fetchConversationHistory]);


  // Efek untuk menggulir ke bawah setiap kali pesan berubah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handler untuk "Delete for me"
  const handleDeleteForMe = useCallback(async (messageId: string) => {
    const confirmDelete = window.confirm("Apakah Anda yakin ingin menghapus pesan ini hanya untuk Anda?");
    if (!confirmDelete) {
      return;
    }

    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`http://localhost:5001/api/messages/${messageId}/delete-for-me`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchConversationHistory(); // Muat ulang riwayat agar pesan yang dihapus tidak terlihat
        fetchFriends(); // Perbarui daftar teman untuk mendapatkan pesan terakhir
        fetchMessageRequests(); // Perbarui pesan permintaan jika perlu
        fetchSuggestedUsers(); // Perbarui saran pengguna
        alert('Pesan berhasil dihapus untuk Anda.');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Gagal menghapus pesan untuk Anda.');
      }
    } catch (error: unknown) {
      console.error("Kesalahan menghapus pesan untuk saya:", error);
      alert('Terjadi kesalahan jaringan saat menghapus pesan untuk Anda.');
    }
  }, [currentUserId, fetchConversationHistory, fetchFriends, fetchMessageRequests, fetchSuggestedUsers, getAuthHeader]);


  // Handler untuk "Unsend message" (menghapus dari database untuk semua)
  const handleUnsendMessage = async (messageId: string) => {
    if (!currentUserId) {
      alert("Anda belum login.");
      return;
    }
    const confirmUnsend = window.confirm("Apakah Anda yakin ingin membatalkan pengiriman pesan ini? Ini akan menghapus pesan untuk kedua belah pihak.");
    if (!confirmUnsend) {
      return;
    }

    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`http://localhost:5001/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (response.ok) {
        alert('Pesan berhasil dibatalkan pengiriman.');
        fetchFriends();
        fetchFriendRequests();
        fetchMessageRequests();
        fetchSuggestedUsers();
        fetchConversationHistory(); // Memuat ulang riwayat percakapan
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Gagal membatalkan pengiriman pesan.');
      }
    } catch (error: unknown) {
      console.error("Kesalahan membatalkan pengiriman pesan:", error);
      alert('Terjadi kesalahan jaringan saat membatalkan pengiriman pesan.');
    }
  };


  // Handler untuk mengirim pesan
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessageContent.trim() || !selectedChatUser) {
      setError("Pesan atau pengguna yang dipilih tidak boleh kosong.")
      return
    }
    if (!currentUserId) {
      setError("Anda belum login.")
      return
    }
    setError(null)

    // Logika konfirmasi permintaan pertemanan
    const isFriend = friends.some(f => f._id === selectedChatUser._id);
    const hasOutgoingRequest = outgoingFriendRequests.some(req => req.recipient._id === selectedChatUser._id);
    const hasIncomingRequest = incomingFriendRequests.some(req => req.requester?._id === selectedChatUser._id);

    // Jika bukan teman dan belum ada permintaan pertemanan yang tertunda (keluar atau masuk)
    if (!isFriend && !hasOutgoingRequest && !hasIncomingRequest) {
        const confirmSendRequest = window.confirm(
            `Anda akan mengirim pesan kepada ${selectedChatUser.username}, yang bukan teman Anda. ` +
            `Mengirim pesan ini juga akan mengirimkan permintaan pertemanan. Lanjutkan?`
        );
        if (!confirmSendRequest) {
            return; // Pengguna membatalkan pengiriman
        }
    }

    try {
      const authHeader = getAuthHeader()
      const response = await fetch("http://localhost:5001/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ receiverUsername: selectedChatUser.username, content: newMessageContent }),
      })
      const data = await response.json()
      if (response.ok) {
        setNewMessageContent("")

        // Optimistically add the new message to the UI
        const tempMessage: MessageProps = {
          _id: data._id || `temp-${Date.now()}`,
          sender: { _id: currentUserId!, username: currentUsername! },
          receiver: { _id: selectedChatUser._id, username: selectedChatUser.username },
          content: newMessageContent,
          timestamp: new Date().toISOString(),
          status: data.status || 'normal'
        };
        setMessages(prevMessages => [...prevMessages, tempMessage]);

        // Muat ulang data untuk memperbarui status pertemanan dan pesan permintaan
        fetchFriends(); // Perbarui daftar teman untuk mendapatkan pesan terakhir
        fetchFriendRequests();
        fetchMessageRequests();
        fetchSuggestedUsers(); // Perbarui saran pengguna

        // Muat ulang riwayat percakapan setelah penundaan singkat
        setTimeout(() => {
          fetchConversationHistory();
        }, 500);

      } else {
        setError(data.message || "Gagal mengirim pesan.")
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

  // Handler untuk logout
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId")
      localStorage.removeItem("username")
      localStorage.removeItem("basicAuthCredentials")
    }
    router.push("/auth/login")
  }

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
  };

  // Handler untuk mencari pengguna
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) {
      try {
        const authHeader = getAuthHeader();
        const response = await fetch(`http://localhost:5001/api/users/search?username=${term}`, {
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
      const response = await fetch('http://localhost:5001/api/users/friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ recipientUsername })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchFriendRequests();
        fetchSuggestedUsers();
      } else {
        alert(data.message || 'Gagal mengirim permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat mengirim permintaan pertemanan:', error);
      alert('Terjadi kesalahan jaringan saat mengirim permintaan pertemanan.');
    }
  };

  // Handler untuk menerima permintaan pertemanan
  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`http://localhost:5001/api/users/friend-request/${friendshipId}/accept`, {
        method: 'PUT',
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchFriendRequests();
        fetchFriends();
        fetchSuggestedUsers();
      } else {
        alert(data.message || 'Gagal menerima permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat menerima permintaan pertemanan:', error);
      alert('Terjadi kesalahan jaringan saat menerima permintaan pertemanan.');
    }
  };

  // Handler untuk menolak permintaan pertemanan
  const handleRejectFriendRequest = async (friendshipId: string) => {
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(`http://localhost:5001/api/users/friend-request/${friendshipId}/reject`, {
        method: 'PUT',
        headers: { Authorization: authHeader }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchFriendRequests();
        fetchSuggestedUsers();
      } else {
        alert(data.message || 'Gagal menolak permintaan pertemanan.');
      }
    } catch (error: unknown) {
      console.error('Kesalahan jaringan saat menolak permintaan pertemanan:', error);
      alert('Terjadi kesalahan jaringan saat menolak permintaan pertemanan.');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <p className="text-xl text-blue-600 font-semibold">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!currentUserId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto h-screen flex gap-4">
        {/* Left Sidebar - Contacts, Search, Requests */}
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
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
                <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-900 placeholder-gray-600"
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
                  {usersFoundBySearch.length === 0 && searchTerm.length > 2 && <p className="text-gray-500 text-sm">Tidak ada pengguna ditemukan.</p>}
                  {usersFoundBySearch.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleChatSelect(user, 'searchResult')}
                      className={`flex items-center p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedChatUser?._id === user._id ? "bg-blue-50 border border-blue-200" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
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
                  <Message key={msg._id} msg={msg} currentUserId={currentUserId!} onDeleteForMe={handleDeleteForMe} onUnsend={handleUnsendMessage} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          {selectedChatUser && (
            <div className="p-6 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    placeholder="Ketik pesan Anda di sini..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pr-12 text-gray-900 placeholder-gray-600"
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
        <div className="w-80 space-y-4">
          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Notifikasi</h2>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
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
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Saran Pengguna</h2>
            </div>
            <div className="p-4 space-y-3">
              {/* Logika tampilan saran pengguna yang diperbarui */}
              {suggestedUsers.length === 0 ? ( // Selalu tampilkan pesan ini jika suggestedUsers kosong
                <p className="text-gray-500 text-sm">Tidak ada saran pengguna. Tambahkan teman untuk mendapatkan saran!</p>
              ) : (
                suggestedUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleChatSelect(user, 'searchResult')} // Menggunakan searchResult karena ini adalah saran, bukan teman langsung
                    className={`flex items-center p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedChatUser?._id === user._id ? "bg-blue-50 border border-blue-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
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
    </div>
  )
}