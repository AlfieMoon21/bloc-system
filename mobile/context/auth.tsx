// COMP204 ADDITION — AuthContext
// This file provides a global authentication state for the mobile app.
// Any screen can call useAuth() to get the current user, log in, register, or log out.
// Using React Context means we don't have to pass user/token as props through every screen.

import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // persistent key-value storage on the device
import { api, setAuthToken } from '../services/api';

// The shape of the user object returned by the server
type User = { id: number; username: string; email: string };

// Everything the context exposes to the rest of the app
type AuthContextType = {
  user: User | null;          // null when not logged in
  token: string | null;       // the JWT - also null when logged out
  isLoading: boolean;         // true while we're checking AsyncStorage on startup
  login: (email: string, password: string) => Promise<string | null>;           // returns an error string or null on success
  register: (email: string, password: string, username: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

// Create the context - null is the default before the provider mounts
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider wraps the whole app (in _layout.tsx) so every screen has access
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // start true until we've checked storage

  // On first render, check if a token was saved from a previous session.
  // This is what keeps the user logged in after closing the app.
  useEffect(() => {
    // multiGet fetches two keys in one call - more efficient than two separate reads
    AsyncStorage.multiGet(['token', 'user']).then(([tokenEntry, userEntry]) => {
      const storedToken = tokenEntry[1]; // multiGet returns [key, value] pairs
      const storedUser = userEntry[1];

      if (storedToken && storedUser) {
        // Restore the token into the api module so requests are authenticated
        setAuthToken(storedToken);
        setToken(storedToken);
        // Parse the JSON string back into a user object
        setUser(JSON.parse(storedUser));
      }
      // Either way, we're done loading - hide splash/loading state
      setIsLoading(false);
    });
  }, []); // empty dependency array = run once on mount only

  // login: calls the API, stores the token, updates state
  // Returns null on success, or an error string so the screen can show it
  const login = async (email: string, password: string): Promise<string | null> => {
    const result = await api.login(email, password);
    if (result.error) return result.error; // pass the error back to the screen

    // Tell the api module to attach this token to all future requests
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);

    // Persist to device storage so the user stays logged in after app restart
    await AsyncStorage.multiSet([
      ['token', result.token],
      ['user', JSON.stringify(result.user)], // objects must be stringified for AsyncStorage
    ]);
    return null; // null = success
  };

  // register: same flow as login - creates account and immediately logs in
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

  // logout: clears everything from memory and from device storage
  const logout = async () => {
    setAuthToken(null); // stop sending the token on future requests
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']); // wipe from device
  };

  return (
    // Provide the state and functions to all child components
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth is a convenience hook - screens call this instead of useContext(AuthContext) directly
// It also throws a helpful error if someone forgets to wrap their app in AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
