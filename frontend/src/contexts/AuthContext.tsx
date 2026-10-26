import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../api/client";

export type Role = "ADMINISTRATOR" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Department {
  id: string;
  name: "Software / IT" | "Product / Design";
  code: "SOFTWARE_IT" | "PRODUCT_DESIGN";
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  isInvited: boolean;
  departmentId?: string;
  department?: Department | null;
  profile?: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; debugToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  savedEmail: string;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "kibo360_access_token";
const REMEMBER_ME_KEY = "kibo360_remembered_email";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedEmail, setSavedEmail] = useState<string>("");

  const refreshUser = async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (response.ok) {
        const json = await response.json();
        setUser(json.data.user);
        setToken(savedToken);
      } else {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY);
    if (remembered) {
      setSavedEmail(remembered);
    }
    refreshUser();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    if (credentials.rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, credentials.email);
      setSavedEmail(credentials.email);
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
      setSavedEmail("");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setIsLoading(false);
        return {
          success: false,
          message: data?.error?.message || "Invalid email or password",
        };
      }

      const receivedToken = data.data.accessToken;
      const receivedUser = data.data.user;

      localStorage.setItem(TOKEN_KEY, receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      setIsLoading(false);

      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.message || "Failed to connect to authentication service.",
      };
    }
  };

  const logout = async () => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Failed to process password reset request");
    }

    return {
      success: true,
      message: data.message,
      debugToken: data.debugToken,
    };
  };

  const resetPassword = async (tokenString: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenString, newPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Failed to reset password");
    }

    return {
      success: true,
      message: data.message,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        requestPasswordReset,
        resetPassword,
        savedEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};