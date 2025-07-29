"use client";

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isLoggedIn, username, logout } = useAuth();

  return (
    <nav className="bg-white shadow-lg py-4 px-6 md:px-12 flex justify-between items-center rounded-b-xl fixed w-full z-50 top-0">
      <div className="text-2xl font-extrabold text-blue-700">
        BEM Chatting
      </div>
      <div className="space-x-6">
        <Link href="/" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
          Beranda
        </Link>
        {isLoggedIn && (
          <Link href="/messages" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
            Messages
          </Link>
        )}
        <Link href="#" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
          Fitur
        </Link>
        <Link href="#" className="text-lg font-medium text-gray-700 hover:text-blue-600 transition duration-300">
          Tentang Kami
        </Link>
        {isLoggedIn ? (
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Logout ({username})
          </button>
        ) : (
          <>
            <Link href="/login" passHref>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                Masuk
              </button>
            </Link>
            <Link href="/register" passHref>
              <button className="bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105">
                Daftar
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;