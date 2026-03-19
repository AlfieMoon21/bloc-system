import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../services/api';

type User = { id: number; username: string; email: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, username: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app start, restore token from storage
  useEffect(() => {
    AsyncStorage.multiGet(['token', 'user']).then(([tokenEntry, userEntry]) => {
      const storedToken = tokenEntry[1];
      const storedUser = userEntry[1];
      if (storedToken && storedUser) {
        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    });
  }, []);

  // Returns null on success, or an error string
  const login = async (email: string, password: string): Promise<string | null> => {
    const result = await api.login(email, password);
    if (result.error) return result.error;

    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.multiSet([
      ['token', result.token],
      ['user', JSON.stringify(result.user)],
    ]);
    return null;
  };

  const register = async (email: string, password: string, username: string): Promise<string | null> => {
    const result = await api.register(email, password, username);
    if (result.error) return result.error;

    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.multiSet([
      ['token', result.token],
      ['user', JSON.stringify(result.user)],
    ]);
    return null;
  };

  const logout = async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}