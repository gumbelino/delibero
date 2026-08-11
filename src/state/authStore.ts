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
  /** True once the account has followed the emailed verification link. */
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  /** True until the initial session check finishes. */
  checking: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** (Re)send the verification email for the signed-in account. */
  sendVerification: () => Promise<void>;
  /** Complete verification with the credentials from the emailed link. */
  confirmVerification: (userId: string, secret: string) => Promise<void>;
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

/** Where Appwrite sends someone after they click the verification link. */
function verifyRedirectUrl(): string {
  return `${window.location.origin}/admin`;
}

async function currentUser(): Promise<AuthUser> {
  const me = await account.get();
  return {
    id: me.$id,
    email: me.email,
    name: me.name,
    emailVerified: me.emailVerification,
    canEdit: await isEditor(),
  };
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
      set({ user: await currentUser(), checking: false });
    } catch {
      // No active session — expected for a signed-out visitor.
      set({ user: null, checking: false });
    }
  },

  async login(email, password) {
    set({ error: null });
    try {
      await account.createEmailPasswordSession({ email, password });
      set({ user: await currentUser() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not sign in." });
      throw err;
    }
  },

  /**
   * Self-service sign-up. New accounts belong to no team, so they land on the
   * "request access" screen rather than gaining any edit rights — Appwrite
   * enforces that server-side through table permissions, not this code.
   *
   * The verification email goes out immediately: an editor approving a request
   * is trusting the address it names, so it should be one the account has
   * proved it owns. A failure to send is not fatal — the account exists, and
   * the access screen offers a resend — so it must not fail the sign-up.
   */
  async register(name, email, password) {
    set({ error: null });
    try {
      await account.create({ userId: ID.unique(), email, password, name });
      await account.createEmailPasswordSession({ email, password });
      try {
        await account.createEmailVerification({ url: verifyRedirectUrl() });
      } catch (err) {
        console.warn("[auth] Could not send the verification email.", err);
      }
      set({ user: await currentUser() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not create the account." });
      throw err;
    }
  },

  async sendVerification() {
    await account.createEmailVerification({ url: verifyRedirectUrl() });
  },

  async confirmVerification(userId, secret) {
    await account.updateEmailVerification({ userId, secret });
    set({ user: await currentUser() });
  },

  async logout() {
    try {
      await account.deleteSession({ sessionId: "current" });
    } finally {
      set({ user: null });
    }
  },
}));
