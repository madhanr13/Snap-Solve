/**
 * Auth Context — manages user authentication state.
 * Stores JWT token in AsyncStorage and provides login/register/logout.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './api';

const AUTH_TOKEN_KEY = '@snapsolve_auth_token';
const AUTH_USER_KEY = '@snapsolve_auth_user';

export interface AuthUser {
  id: number;
  username: string;
  display_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved auth on mount
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const savedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('[Auth] Failed to load saved auth:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password,
      });
      const { token: jwt, user: userData } = res.data;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, jwt);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      setToken(jwt);
      setUser(userData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail || 'Login failed';
        throw new Error(detail);
      }
      throw new Error('Can\'t reach the server. Check your connection.');
    }
  };

  const register = async (username: string, password: string, displayName?: string) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/register`, {
        username,
        password,
        display_name: displayName || username,
      });
      const { token: jwt, user: userData } = res.data;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, jwt);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      setToken(jwt);
      setUser(userData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail || 'Registration failed';
        throw new Error(detail);
      }
      throw new Error('Can\'t reach the server. Check your connection.');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
