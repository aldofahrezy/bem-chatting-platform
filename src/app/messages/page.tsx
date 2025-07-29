// src/app/messages/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Komponen untuk menampilkan satu pesan
interface MessageProps {
  _id: string; // ID pesan dari MongoDB
  sender: { _id: string; username: string }; // Detail pengirim
  receiver: { _id: string; username: string }; // Detail penerima
  content: string;
  timestamp: string; // Tanggal dalam format string
}

const Message: React.FC<{ msg: MessageProps; currentUserId: string }> = ({ msg, currentUserId }) => {
  const isMe = msg.sender._id === currentUserId;
  const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
          isMe
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-xs text-gray-300 mb-1">{isMe ? 'Anda' : msg.sender.username}</p>
        <p className="text-sm md:text-base">{msg.content}</p>
        <p className="text-xs text-right mt-1 opacity-75">{formattedTime}</p>
      </div>
    </div>
  );
};

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [newMessageContent, setNewMessageContent] = useState<string>('');
  const [otherUserUsername, setOtherUserUsername] = useState<string>(''); // Username lawan bicara
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fungsi untuk mendapatkan kredensial Basic Auth dari LocalStorage
  const getAuthHeader = () => {
    if (typeof window !== 'undefined') {
      const credentials = localStorage.getItem('basicAuthCredentials');
      return credentials ? `Basic ${credentials}` : '';
    }
    return '';
  };

  // Efek untuk memeriksa status login dan memuat data pengguna
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');

      if (!userId || !username) {
        router.push('/auth/login'); // Arahkan ke halaman login jika belum login
      } else {
        setCurrentUserId(userId);
        setCurrentUsername(username);
        setLoading(false); // Selesai memuat data pengguna
      }
    }
  }, [router]);

  // Efek untuk memuat pesan ketika currentUserId atau otherUserUsername berubah
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUserId || !otherUserUsername) return; // Jangan fetch jika belum ada data lengkap

      setError(null);
      try {
        const authHeader = getAuthHeader();
        const response = await fetch(`http://localhost:5001/api/messages?otherUsername=${otherUserUsername}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setMessages(data);
        } else {
          setError(data.message || 'Gagal memuat pesan.');
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('Kesalahan memuat pesan:', err);
          setError('Terjadi kesalahan jaringan atau server saat memuat pesan: ' + err.message);
        } else {
          setError('Terjadi kesalahan jaringan atau server saat memuat pesan: An unknown error occurred.');
        }
      }
    };

    if (currentUserId && otherUserUsername) {
      fetchMessages();
    }
  }, [currentUserId, otherUserUsername]); // Dependensi: userId dan username lawan bicara

  // Efek untuk menggulir ke bawah setiap kali pesan berubah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler untuk mengirim pesan
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !otherUserUsername.trim()) {
      setError('Pesan atau username lawan bicara tidak boleh kosong.');
      return;
    }
    if (!currentUserId) {
      setError('Anda belum login.');
      return;
    }

    setError(null);
    try {
      const authHeader = getAuthHeader();
      const response = await fetch('http://localhost:5001/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ receiverUsername: otherUserUsername, content: newMessageContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewMessageContent('');
        const fetchUpdatedMessages = async () => {
          try {
            const updatedResponse = await fetch(`http://localhost:5001/api/messages?otherUsername=${otherUserUsername}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
            });
            const updatedData = await updatedResponse.json();
            if (updatedResponse.ok) {
              setMessages(updatedData);
            } else {
              setError(updatedData.message || 'Gagal memperbarui pesan setelah pengiriman.');
            }
          } catch (err: unknown) {
            if (err instanceof Error) {
              console.error('Kesalahan memperbarui pesan:', err);
              setError('Kesalahan jaringan saat memperbarui pesan: ' + err.message);
            } else {
              setError('Kesalahan jaringan saat memperbarui pesan: An unknown error occurred.');
            }
          }
        };
        fetchUpdatedMessages();

      } else {
        setError(data.message || 'Gagal mengirim pesan.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Kesalahan mengirim pesan:', err);
        setError('Terjadi kesalahan jaringan atau server saat mengirim pesan: ' + err.message);
      } else {
        setError('Terjadi kesalahan jaringan atau server saat mengirim pesan: An unknown error occurred.');
      }
    }
  };

  // Handler untuk logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('basicAuthCredentials'); // Hapus kredensial Basic Auth
    }
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-blue-600">Memuat...</p>
      </div>
    );
  }

  // Jika belum login, jangan render konten halaman pesan
  if (!currentUserId) {
    return null; // Redirect akan ditangani oleh useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
      {/* Navigation Bar untuk halaman pesan */}
      <nav className="bg-blue-700 shadow-lg py-4 px-6 md:px-12 flex justify-between items-center rounded-b-xl text-white">
        <div className="text-2xl font-extrabold">BEM Chatting</div>
        <div className="flex items-center space-x-4">
          <span className="text-lg font-medium">Halo, {currentUsername}!</span>
          <Link href="/" className="text-lg font-medium hover:text-blue-200 transition duration-300">
            &larr; Kembali ke Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col p-6 max-w-3xl mx-auto w-full">
        {/* Input Username Lawan Bicara */}
        <div className="mb-4">
          <label htmlFor="otherUsername" className="block text-lg font-medium text-gray-900 mb-2">
            Chat dengan:
          </label>
          <input
            type="text"
            id="otherUsername"
            value={otherUserUsername}
            onChange={(e) => setOtherUserUsername(e.target.value)}
            placeholder="Masukkan username lawan bicara"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg placeholder-gray-400 text-gray-900" // Added placeholder-gray-600
          />
        </div>

        {/* Area Pesan */}
        <div className="flex-1 overflow-y-auto p-4 bg-white rounded-lg shadow-md mb-6 border border-gray-200">
          {error && <p className="text-red-600 text-center mb-4">{error}</p>}
          {messages.length === 0 && !error && (
            <p className="text-center text-gray-500">Belum ada pesan dengan {otherUserUsername || 'pengguna ini'}.</p>
          )}
          {messages.map((msg) => (
            <Message key={msg._id} msg={msg} currentUserId={currentUserId!} />
          ))}
          {/* Ref untuk menggulir ke bawah */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Pesan */}
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="text"
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            placeholder="Ketik pesan Anda..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg placeholder-gray-400 text-gray-900" // Added placeholder-gray-600
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-lg"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}