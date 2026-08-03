// Session state for the admin area. End users never touch this — the wizard is
// entirely anonymous.

import { create } from "zustand";
import { Teams, ID } from "appwrite";
import { account, client, isAppwriteConfigured, EDITORS_TEAM_ID } from "../lib/appwrite";

const teams = new Teams(client);

interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** True when the account belongs to the editors team and so may write. */
  canEdit: boolean;
}

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check finishes. */
  checking: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function isEditor(): Promise<boolean> {
  try {
    const list = await teams.list();
    return list.teams.some((t) => t.$id === EDITORS_TEAM_ID);
  } catch {
    return false;
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  checking: true,
  error: null,

  async init() {
    if (!isAppwriteConfigured) {
      set({ checking: false, user: null });
      return;
    }
    try {
      const me = await account.get();
      set({
        user: { id: me.$id, email: me.email, name: me.name, canEdit: await isEditor() },
        checking: false,
      });
    } catch {
      // No active session — expected for a signed-out visitor.
      set({ user: null, checking: false });
    }
  },

  async login(email, password) {
    set({ error: null });
    try {
      await account.createEmailPasswordSession({ email, password });
      const me = await account.get();
      set({
        user: { id: me.$id, email: me.email, name: me.name, canEdit: await isEditor() },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not sign in." });
      throw err;
    }
  },

  /**
   * Self-service sign-up. New accounts belong to no team, so they land on the
   * "ask an administrator" screen rather than gaining any edit rights — Appwrite
   * enforces that server-side through table permissions, not this code.
   */
  async register(name, email, password) {
    set({ error: null });
    try {
      await account.create({ userId: ID.unique(), email, password, name });
      await account.createEmailPasswordSession({ email, password });
      const me = await account.get();
      set({
        user: { id: me.$id, email: me.email, name: me.name, canEdit: await isEditor() },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not create the account." });
      throw err;
    }
  },

  async logout() {
    try {
      await account.deleteSession({ sessionId: "current" });
    } finally {
      set({ user: null });
    }
  },
}));
