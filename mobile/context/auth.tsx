import { createContext, useContext, useState } from 'react';
import { api, setAuthToken } from '../services/api';

type User = { id: number; username: string; email: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, username: string) => Promise<string | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<string | null> => {
    const result = await api.login(email, password);
    if (result.error) return result.error;
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return null;
  };

  const register = async (email: string, password: string, username: string): Promise<string | null> => {
    const result = await api.register(email, password, username);
    if (result.error) return result.error;
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return null;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
