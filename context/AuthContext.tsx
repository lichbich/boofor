"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  username: string;
  role: "admin" | "user" | "guest";
  theme?: "light" | "dark";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  theme: "light" | "dark";
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoading, setIsLoading] = useState(true);

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Initialize theme from localStorage as early as possible
  useEffect(() => {
    const savedTheme = localStorage.getItem("boofor_theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Helper to apply theme
  const applyTheme = useCallback((newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("boofor_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Check current session
  const checkSession = useCallback(async () => {
    if (isLocal) {
      setUser({
        username: "Local Developer",
        role: "admin",
        theme: (localStorage.getItem("boofor_theme") as "light" | "dark") || "light",
      });
      setIsLoading(false);
      return;
    }

    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        // Sync theme from database profile
        if (data.user?.theme) {
          applyTheme(data.user.theme);
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("boofor_session_id");
        }
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyTheme, isLocal]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Login action
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      if (typeof window !== "undefined" && data.sessionId) {
        localStorage.setItem("boofor_session_id", data.sessionId);
      }
      
      setUser(data.user);

      // Sync theme from database profile on login
      if (data.user?.theme) {
        applyTheme(data.user.theme);
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register action
  const register = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Đăng ký thất bại");
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    setIsLoading(true);
    if (isLocal) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        headers,
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("boofor_session_id");
      }
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await checkSession();
  };

  // Toggle Theme action
  const toggleTheme = useCallback(async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    applyTheme(newTheme);

    // If user is logged in, sync with database
    if (user && !isLocal) {
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
        await fetch("/api/auth/theme", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(storedToken ? { "Authorization": `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify({ theme: newTheme }),
        });
      } catch (error) {
        console.error("Failed to update theme in database:", error);
      }
    }
  }, [theme, user, applyTheme, isLocal]);

  return (
    <AuthContext.Provider value={{ user, isLoading, theme, login, register, logout, refreshUser, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
