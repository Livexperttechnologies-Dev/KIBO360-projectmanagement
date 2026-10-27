import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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
  authenticatorCode?: string;
}

export interface TwoFactorLoginChallenge {
  requiresTwoFactor: true;
  requiresEnrollment?: boolean;
  usesSuperAdminAuthenticator?: boolean;
  setupSecret?: string;
  setupUri?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string; challenge?: TwoFactorLoginChallenge }>;
  logout: () => Promise<void>;
  resetPassword: (email: string, authenticatorCode: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  savedEmail: string;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "kibo360_access_token";
const REMEMBER_ME_KEY = "kibo360_remembered_email";

function tokenTimeRemaining(token: string): number {
  try {
    const encodedPayload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(encodedPayload));
    return typeof payload.exp === "number" ? payload.exp * 1000 - Date.now() : 0;
  } catch {
    return 0;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedEmail, setSavedEmail] = useState<string>("");
  const refreshRequest = useRef<Promise<boolean> | null>(null);

  const refreshAccessToken = useCallback((): Promise<boolean> => {
    if (refreshRequest.current) return refreshRequest.current;

    const request = (async () => {
      try {
        // Refresh tokens rotate on every request. Serialize refreshes across
        // browser tabs so a second tab cannot reuse the token just revoked by
        // the first tab and mistakenly clear the shared local session.
        const performRefresh = async () => {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });
          const json = await response.json().catch(() => null);
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem(TOKEN_KEY);
              setUser(null);
              setToken(null);
            }
            return false;
          }

          const nextToken = json?.data?.accessToken;
          const nextUser = json?.data?.user;
          if (typeof nextToken !== "string" || !nextUser) return false;
          localStorage.setItem(TOKEN_KEY, nextToken);
          setToken(nextToken);
          setUser(nextUser);
          return true;
        };

        if (navigator.locks) {
          return await navigator.locks.request("kibo360-auth-refresh", performRefresh);
        }
        return await performRefresh();
      } catch {
        return false;
      } finally {
        refreshRequest.current = null;
      }
    })();

    refreshRequest.current = request;
    return request;
  }, []);

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
        credentials: "include",
      });

      if (response.ok) {
        const json = await response.json();
        setUser(json.data.user);
        setToken(savedToken);
      } else {
        await refreshAccessToken();
      }
    } catch {
      // Keep the saved session if the server is temporarily unreachable.
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

  useEffect(() => {
    if (!token) return;

    let retryTimer: number | undefined;
    const attemptRefresh = async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed && localStorage.getItem(TOKEN_KEY)) {
        retryTimer = window.setTimeout(() => void attemptRefresh(), 60 * 1000);
      }
    };
    const refreshTimer = window.setTimeout(() => void attemptRefresh(), 12 * 60 * 1000);
    const refreshOnReturn = () => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (currentToken && tokenTimeRemaining(currentToken) < 2 * 60 * 1000) {
        void attemptRefresh();
      }
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.clearTimeout(refreshTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [token, refreshAccessToken]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message?: string; challenge?: TwoFactorLoginChallenge }> => {
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

      if (data?.data?.requiresTwoFactor) {
        setIsLoading(false);
        return { success: false, challenge: data.data };
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

  const resetPassword = async (email: string, authenticatorCode: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, authenticatorCode, newPassword }),
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
