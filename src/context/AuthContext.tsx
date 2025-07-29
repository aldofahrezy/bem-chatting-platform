"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// Tipe data untuk nilai Context
interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  login: (userId: string, username: string, credentials: string) => void;
  logout: () => void;
}

// Buat Context dengan nilai default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props untuk AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Inisialisasi status dari localStorage saat aplikasi dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedUsername = localStorage.getItem("username");
      if (storedUserId && storedUsername) {
        setIsLoggedIn(true);
        setUsername(storedUsername);
      } else {
        setIsLoggedIn(false);
        setUsername(null);
      }
    }
  }, []);

  // Fungsi untuk proses login
  const login = useCallback(
    (userId: string, userUsername: string, credentials: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("userId", userId);
        localStorage.setItem("username", userUsername);
        localStorage.setItem("basicAuthCredentials", credentials);
        setIsLoggedIn(true);
        setUsername(userUsername);
      }
    },
    []
  );

  // Fungsi untuk proses logout
  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("basicAuthCredentials");
      setIsLoggedIn(false);
      setUsername(null);
    }
    router.push("/"); // Redirect ke halaman login setelah logout
  }, [router]);

  // Nilai yang akan disediakan oleh Context
  const contextValue = {
    isLoggedIn,
    username,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook untuk menggunakan AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};