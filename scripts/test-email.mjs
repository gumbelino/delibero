#!/usr/bin/env node
/**
 * Sends one real email through whatever SMTP the Appwrite project is configured
 * with, so delivery can be tested without clicking through the app.
 *
 * It triggers a **password recovery** email, because that is the only mail
 * Appwrite will send for an existing account without a session or an API key.
 * The recovery link it contains is harmless: it expires, and it does nothing
 * unless somebody opens it and sets a new password.
 *
 * Why this and not a plain SMTP check: it exercises Appwrite's own mail path —
 * project SMTP settings, sender address, templates — which is what actually
 * breaks. A working SMTP server that Appwrite is not configured to use would
 * still pass a direct test and fail here.
 *
 *   npm run appwrite:test-email you@example.com
 */

import { Client, Account } from "appwrite";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const email = process.argv[2];
const endpoint = process.env.VITE_APPWRITE_ENDPOINT ?? process.env.APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID;

if (!email) {
  console.error(
    "Usage: npm run appwrite:test-email <email> [redirect-url]\n\n" +
      "Sends a password-recovery email to that address, which must belong to an\n" +
      "existing account.\n\n" +
      "The redirect URL defaults to http://localhost:5173/admin. Any hostname\n" +
      "works as long as it is registered as a Web platform; nobody has to open\n" +
      "the link for the delivery test to be meaningful.",
  );
  process.exit(1);
}
if (!endpoint || !projectId) {
  console.error("Missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID (see .env.example).");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);
const account = new Account(client);

// Appwrite only accepts a redirect URL whose hostname is registered as a Web
// platform, to prevent open redirects. localhost is allowed out of the box,
// which makes it the safe default here — this script tests mail delivery, and
// nobody needs to open the link for that.
const url =
  process.argv[3] ?? process.env.APPWRITE_SITE_URL ?? "http://localhost:5173/admin";

try {
  await account.createRecovery({ email, url });
  console.log(
    `Appwrite accepted the request and queued a recovery email to ${email}.\n\n` +
      "If it does not arrive within a few minutes:\n" +
      "  · check spam / quarantine\n" +
      "  · console → project → Settings → SMTP — is a custom server configured?\n" +
      "  · check the sender domain passes SPF/DKIM (see docs/smtp.md)\n\n" +
      "Appwrite reports success as soon as the mail is handed off, so this\n" +
      "proves the request worked — not that the message was delivered.",
  );
} catch (err) {
  console.error(`Failed (${err?.code ?? "?"} ${err?.type ?? ""}): ${err?.message ?? err}`);
  if (err?.code === 400) {
    console.error(
      `\nTried to redirect to: ${url}\n\n` +
        `A 400 here means that hostname is not registered as a Web platform.\n` +
        `Pass one that is — e.g. your deployed site — or add it under\n` +
        `console → Overview → Add platform → Web.\n\n` +
        `Worth checking either way: an unregistered production hostname also\n` +
        `fails CORS on every database read, so the app itself would be broken\n` +
        `there, and the in-app "Send the verification email" button would fail\n` +
        `with this same error.`,
    );
  }
  process.exit(1);
}
