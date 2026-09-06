import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authApi, LoginRequestPayload } from '../api/services';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequestPayload) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const cachedUserStr = localStorage.getItem('cgc_user') || sessionStorage.getItem('cgc_user');

    if (cachedUserStr) {
      try {
        const cached = JSON.parse(cachedUserStr);
        setUser(cached);
        setLoading(false);
      } catch (e) {
        // ignore parse error
      }
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('cgc_user', JSON.stringify(userData));
      sessionStorage.setItem('cgc_user', JSON.stringify(userData));
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.error('Failed to fetch user context', err);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('cgc_user');
        sessionStorage.removeItem('cgc_user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: LoginRequestPayload): Promise<User> => {
    const response = await authApi.login(credentials);
    localStorage.setItem('token', response.access_token);
    sessionStorage.setItem('token', response.access_token);
    const userData = await authApi.getMe();
    setUser(userData);
    localStorage.setItem('cgc_user', JSON.stringify(userData));
    sessionStorage.setItem('cgc_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('cgc_user');
    sessionStorage.removeItem('cgc_user');
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isStaff,
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
