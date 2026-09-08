"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { $api, clearSession, setSession } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      try {
        const raw = localStorage.getItem("campku_token");
        if (raw) {
          const me = await $api.get<User>("/me");
          setUser(me);
        } else {
          setUser(null);
        }
      } catch {
        await clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname.startsWith("/signin") || pathname.startsWith("/signup");
      if (!user && !isAuthPage) {
        router.push("/signin");
      } else if (user && isAuthPage) {
        router.push("/");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await $api.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
    }>("/auth/login", { email, password });
    await setSession(res);
    setUser(res.user);
    router.push("/");
  };

  const logout = async () => {
    try {
      const raw = localStorage.getItem("campku_token");
      const refreshToken = raw ? JSON.parse(raw).refreshToken : undefined;
      await $api.post("/auth/logout", { refreshToken });
    } catch {
      // Ignore errors on logout
    } finally {
      await clearSession();
      setUser(null);
      router.push("/signin");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
