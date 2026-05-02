import { useState } from "react";
import type { SessionUser } from "@latam-payouts/contracts";
import { api } from "../lib/api";

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
} | null;

const SESSION_STORAGE_KEY = "latam-payouts-session";

function readStoredSession(): SessionState {
  const value = localStorage.getItem(SESSION_STORAGE_KEY);
  return value ? (JSON.parse(value) as SessionState) : null;
}

export function useSession() {
  const [session, setSession] = useState<SessionState>(readStoredSession);

  async function login(email: string, password: string) {
    const nextSession = await api.login(email, password);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  }

  return {
    session,
    login,
    logout,
  };
}
