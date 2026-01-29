"use client";

import { createContext, useContext } from "react";

export type MemberMe = {
  id: number;
  username: string;
  name: string;
  score: number;
  apiKey?: string;
  profileImgUrl?: string | null;
  createDate: string;
  modifyDate: string;
};

type AuthContextValue = {
  me: MemberMe | null;
  setMe: (me: MemberMe | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  me,
  setMe,
  children,
}: {
  me: MemberMe | null;
  setMe: (me: MemberMe | null) => void;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ me, setMe }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
