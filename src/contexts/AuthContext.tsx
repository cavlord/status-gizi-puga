import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface User {
  email: string;
  role: string;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'posyandu_auth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Clear all cached data on logout
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    // Check for existing session
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Listen for storage changes (for multi-tab logout sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (!e.newValue) {
          // User logged out in another tab
          setUser(null);
          window.location.href = '/auth';
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            setUser(parsed);
          } catch {
            // Invalid data
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Clear all cached data BEFORE login to ensure fresh data
      queryClient.clear();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login gagal' };
      }

      const userData: User = {
        email: data.user.email,
        role: data.user.role,
        verified: data.user.verified,
      };

      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registrasi gagal' };
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Terjadi kesalahan saat registrasi' };
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Verifikasi gagal' };
      }

      return { success: true };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: 'Terjadi kesalahan saat verifikasi' };
    }
  };

  const resendOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Gagal mengirim ulang OTP' };
      }

      return { success: true };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { success: false, error: 'Terjadi kesalahan saat mengirim OTP' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
