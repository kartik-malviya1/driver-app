import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '../services/api';

interface AuthUser {
  id: number;
  name: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  setIsOnline: (status: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  isOnline: false,
  loginWithToken: async () => {},
  signOut: async () => {},
  setIsOnline: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOnline, setIsOnlineState] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: check AsyncStorage for existing session
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser, savedOnline] = await Promise.all([
          getToken(),
          getStoredUser(),
          import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@driver_app/is_online')),
        ]);

        if (savedToken && savedUser) {
          setTokenState(savedToken);
          setUser(savedUser);
        }
        
        if (savedOnline === 'true') {
          setIsOnlineState(true);
        }
      } catch (err) {
        console.error('Error restoring auth state:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginWithToken = async (newToken: string, newUser: AuthUser) => {
    await setToken(newToken);
    await setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    await clearToken();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem('@driver_app/is_online');
    setTokenState(null);
    setUser(null);
    setIsOnlineState(false);
  };

  const setIsOnline = async (status: boolean) => {
    setIsOnlineState(status);
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@driver_app/is_online', String(status));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!token,
        isOnline,
        loginWithToken,
        signOut,
        setIsOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);