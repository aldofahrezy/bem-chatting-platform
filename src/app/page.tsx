'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Periksa status login dari LocalStorage saat komponen dimuat di sisi klien
    // Menggunakan !!localStorage.getItem('userId') untuk mengonversi nilai menjadi boolean
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('userId')); // Cek keberadaan userId
    }
  }, []);

  // Tentukan tujuan tombol "Mulai Ngobrol Sekarang!" berdasarkan status login
  const chatButtonHref = isLoggedIn ? '/messages' : '/auth/login';

  // Handler untuk logout dari Navbar Homepage
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('basicAuthCredentials');
    }
    window.location.href = '/auth/login'; // Redirect manual setelah logout
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter text-gray-800">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg py-4 px-6 md:px-12 flex justify-between items-center rounded-b-xl">
        <div className="text-2xl font-extrabold text-blue-700">
          BEM Chatting
        </div>
        <div className="space-x-6">
          <Link href="/" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
            Beranda
          </Link>
          <Link href="#" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
            Fitur
          </Link>
          <Link href="#" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
            Tentang Kami
          </Link>
          {/* Tombol Masuk/Logout di Navbar */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/auth/login" passHref>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                  Masuk
                </button>
              </Link>
              <Link href="/auth/register" passHref>
                <button className="bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                  Daftar
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex items-center justify-center h-[calc(100vh-80px)] text-center px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: '' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-extrabold leading-tight mb-6 text-blue-800 drop-shadow-lg">
            BEM Chatting
          </h1>
          <p className="text-2xl md:text-3xl font-light leading-relaxed text-gray-700 mb-10">
            adalah tempat ngobrol khusus buat anak-anak BEM — biar koordinasi kegiatan, rapat divisi, atau sekadar diskusi jadi makin lancar dan seru. ✌️
          </p>
          {/* Tombol yang mengarah ke halaman pesan atau login */}
          <Link href={chatButtonHref} passHref>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-full shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 text-xl">
              Mulai Ngobrol Sekarang!
            </button>
          </Link>
        </div>
      </section>

      {/* Keunggulan Layanan (Features Section) */}
      <section className="py-20 px-6 md:px-12 bg-white rounded-t-xl shadow-inner">
        <h2 className="text-5xl font-extrabold text-center text-blue-800 mb-16">
          Mengapa BEM Chatting?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-blue-50 p-8 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-2">
            <div className="text-5xl text-blue-600 mb-6 text-center">⚡</div> {/* Emoji for instant and fast */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Instan dan Cepat</h3>
            <p className="text-lg text-gray-700 text-center">
              Kirim pesan dan dapatkan balasan secepat kilat. Tidak ada lagi menunggu, semua informasi langsung sampai.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-blue-50 p-8 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-2">
            <div className="text-5xl text-blue-600 mb-6 text-center">🤝</div> {/* Emoji for connected */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Terkoneksi Antar Sesama</h3>
            <p className="text-lg text-gray-700 text-center">
              Jalin komunikasi erat dengan seluruh anggota BEM. Diskusikan ide, koordinasi acara, semua dalam satu tempat.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-blue-50 p-8 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-2">
            <div className="text-5xl text-blue-600 mb-6 text-center">📚</div> {/* Emoji for sharing */}
            <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Sharing Materi Makin Seru!</h3>
            <p className="text-lg text-gray-700 text-center">
              Bagikan catatan kuliah, materi rapat, atau bahkan meme lucu dengan mudah. Kolaborasi jadi lebih asik!
            </p>
          </div>
        </div>
      </section>

      {/* Footer (Optional, but good practice) */}
      <footer className="py-8 bg-gray-800 text-white text-center text-sm">
        <p>&copy; 2025 BEM Chatting. All rights reserved.</p>
      </footer>
    </div>
  );
}