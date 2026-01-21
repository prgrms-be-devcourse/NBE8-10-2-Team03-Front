"use client";

import { createContext, useContext } from "react";

export type MemberMe = {
  id: number;
  username: string;
  name: string;
  score: number;
  apiKey?: string;
  createDate: string;
  modifyDate: string;
};

type AuthContextValue = {
  me: MemberMe | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  me,
  children,
}: {
  me: MemberMe | null;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={{ me }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
