'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { setAccessToken } from '../utils/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load current user on start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Attempt to get user. If access token is expired but refresh token exists,
        // axios interceptor will handle the refresh seamlessly.
        const response = await api.get('/auth/me');
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        // Not logged in or refresh failed
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for global unauthorized events (from axios interceptor)
    const handleUnauthorized = () => {
      setUser(null);
      router.push('/login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [router]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser } = response.data;
      
      setAccessToken(accessToken);
      setUser(loggedUser);
      toast.success('Successfully logged in');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/signup', { name, email, password, role });
      const { accessToken, user: registeredUser } = response.data;
      
      setAccessToken(accessToken);
      setUser(registeredUser);
      toast.success('Registration successful');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error on server:', error);
    } finally {
      setAccessToken('');
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/login');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
