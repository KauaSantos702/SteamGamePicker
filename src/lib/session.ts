import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  steamId?: string;
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  // Firebase Hosting strips every cookie except "__session" before forwarding to the server.
  cookieName: "__session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres (veja .env.example).");
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
