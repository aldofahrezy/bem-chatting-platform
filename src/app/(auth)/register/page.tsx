'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { BASE_API_URL } from '@/utils/constants';

export default function RegisterPage() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { login } = useAuth();

  // --- INTERFACES UNTUK RESPON API ---
  interface RegisterSuccessData {
    message: string;
    userId: string;
    username: string;
  }

  interface ErrorData {
    message: string;
  }
  // --- AKHIR INTERFACES ---

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: RegisterSuccessData | ErrorData = await response.json();

      if (response.ok) {
        const successData = data as RegisterSuccessData;
        
        // Langsung Login setelah Pendaftaran Berhasil
        if (successData.userId && successData.username) {
            const credentials = btoa(`${username}:${password}`); // Buat kredensial untuk Basic Auth
            login(successData.userId, successData.username, credentials); // Panggil fungsi login dari Context
            setSuccess('Pendaftaran berhasil! Anda berhasil login.');
            router.push('/messages'); // Langsung arahkan ke halaman pesan
        } else {
            // Jika backend tidak mengembalikan userId/username, fallback ke redirect ke login
            setSuccess(successData.message || 'Pendaftaran berhasil! Silakan login.');
            setTimeout(() => {
                router.push('/login'); // Redirect ke halaman login setelah sukses
            }, 1500);
        }

      } else {
        const errorData = data as ErrorData;
        setError(errorData.message || 'Pendaftaran gagal. Silakan coba lagi.');
      }
    } catch (err: unknown) {
      console.error('Kesalahan saat mendaftar:', err);
      if (err instanceof Error) {
        setError(`Terjadi kesalahan jaringan atau server: ${err.message}`);
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
          Daftar Akun BEM Chatting
        </h1>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-lg font-medium text-gray-700 mb-2">
              Nama Pengguna
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-400"
              placeholder="Pilih nama pengguna"
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
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-400"
              placeholder="Buat kata sandi"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-lg font-medium text-gray-700 mb-2">
              Konfirmasi Kata Sandi
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg text-gray-900 placeholder-gray-400"
              placeholder="Konfirmasi kata sandi"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-red-600 text-center text-sm">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-center text-sm">{success}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-xl"
            disabled={loading}
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600 text-sm">
          Sudah punya akun? <Link href="/login" className="text-blue-600 hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}