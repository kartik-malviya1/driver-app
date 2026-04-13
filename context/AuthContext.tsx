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
  loginWithToken: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  loginWithToken: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: check AsyncStorage for existing session
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          getToken(),
          getStoredUser(),
        ]);

        if (savedToken && savedUser) {
          setTokenState(savedToken);
          setUser(savedUser);
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
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!token,
        loginWithToken,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);