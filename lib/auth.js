import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'session';
const SESSION_HOURS = 6;

// Sama persis algoritma hash di Kode.gs (Utilities.computeDigest SHA_256) — password
// yang sudah dihash di sheet Users tetap kompatibel, gak perlu re-migrasi.
export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: `${SESSION_HOURS}h` });
}

export function verifySession(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_HOURS * 60 * 60,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}
