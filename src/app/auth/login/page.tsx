'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Cek apakah pengguna sudah login (ada userId di LocalStorage)
    if (typeof window !== 'undefined' && localStorage.getItem('userId')) {
      router.push('/messages'); // Arahkan ke halaman pesan jika sudah login
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Define an interface for the expected successful response data
      interface LoginSuccessData {
        userId: string;
        username: string;
      }

      // Define an interface for the expected error response data
      interface ErrorData {
        message: string;
      }

      // We'll parse the JSON data here, but type it based on success/failure later
      const data: LoginSuccessData | ErrorData = await response.json();

      if (response.ok) {
        // Type assertion to tell TypeScript that 'data' is LoginSuccessData here
        const successData = data as LoginSuccessData;
        if (typeof window !== 'undefined') {
          localStorage.setItem('userId', successData.userId); // Simpan ID pengguna
          localStorage.setItem('username', successData.username); // Simpan username
          // Untuk Basic Auth, kita juga perlu menyimpan kredensial base64
          const credentials = btoa(`${username}:${password}`);
          localStorage.setItem('basicAuthCredentials', credentials);
        }
        router.push('/messages'); // Arahkan ke halaman pesan setelah login berhasil
      } else {
        // Type assertion to tell TypeScript that 'data' is ErrorData here
        const errorData = data as ErrorData;
        setError(errorData.message || 'Login gagal. Silakan coba lagi.');
      }
    } catch (err: unknown) {
      console.error('Kesalahan saat login:', err);
      if (err instanceof Error) {
        setError(`Terjadi kesalahan: ${err.message}`);
      } else {
        setError('Terjadi kesalahan jaringan atau server yang tidak diketahui.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center font-inter">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-extrabold text-center text-blue-800 mb-8">
          Masuk ke BEM Chatting
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
              Nama Pengguna
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="Masukkan nama pengguna"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
              Kata Sandi
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
              placeholder="Masukkan kata sandi"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-red-600 text-center text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-xl"
            disabled={loading}
          >
            {loading ? 'Masuk...' : 'Login'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600 text-sm">
          Belum punya akun? <Link href="/auth/register" className="text-blue-600 hover:underline">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
}