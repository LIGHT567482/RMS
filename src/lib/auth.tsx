import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureInitialized, getAuth, setAuth as persistAuth } from "./storage";
import type { AuthInfo } from "./types";

interface AuthCtx {
  isAuthenticated: boolean;
  hasAccount: boolean;
  signIn: (code: string) => boolean;
  signOut: () => void;
  setupAccount: (info: AuthInfo) => void;
  resetCode: (newCode: string) => void;
  getInfo: () => AuthInfo | null;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    ensureInitialized();
    setHasAccount(!!getAuth());
    setAuthed(sessionStorage.getItem("ample_session") === "1");
  }, []);

  const value: AuthCtx = {
    isAuthenticated: authed,
    hasAccount,
    signIn: (code) => {
      const a = getAuth();
      if (a && a.accessCode === code) {
        sessionStorage.setItem("ample_session", "1");
        setAuthed(true);
        return true;
      }
      return false;
    },
    signOut: () => {
      sessionStorage.removeItem("ample_session");
      setAuthed(false);
      setHasAccount(!!getAuth());
    },
    setupAccount: (info) => {
      persistAuth(info);
      setHasAccount(true);
      sessionStorage.setItem("ample_session", "1");
      setAuthed(true);
    },
    resetCode: (newCode) => {
      const a = getAuth();
      if (a) persistAuth({ ...a, accessCode: newCode });
    },
    getInfo: () => getAuth(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
