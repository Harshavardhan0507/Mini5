import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, verifyUserToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kisan_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('kisan_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kisan_token');
    localStorage.removeItem('kisan_user');
  };

  useEffect(() => {
    async function verify() {
      if (token) {
        try {
          const res = await verifyUserToken(token);
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('kisan_user', JSON.stringify(res.user));
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Token verify failed:', err);
        }
      }
      setLoading(false);
    }
    verify();
  }, [token]);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('kisan_token', res.token);
      localStorage.setItem('kisan_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    if (res.success && res.token) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('kisan_token', res.token);
      localStorage.setItem('kisan_user', JSON.stringify(res.user));
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
