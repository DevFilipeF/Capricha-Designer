import { compareSync, hashSync } from 'bcryptjs';
import { db } from './db';

const AUTH_KEY = 'caprichapam_auth';
const ATTEMPTS_KEY = 'caprichapam_auth_attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export interface AuthSession {
  userId: number;
  username: string;
  loginAt: string;
}

interface AttemptState {
  count: number;
  lockedUntil: number | null;
}

function readAttempts(): AttemptState {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as AttemptState;
    return { count: parsed.count ?? 0, lockedUntil: parsed.lockedUntil ?? null };
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function writeAttempts(state: AttemptState) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
}

/** Minutos restantes de bloqueio por tentativas erradas (0 quando liberado). */
export function lockRemainingMinutes(): number {
  const { lockedUntil } = readAttempts();
  if (!lockedUntil) return 0;
  const remaining = lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

export async function localLogin(username: string, password: string): Promise<AuthSession | null> {
  if (lockRemainingMinutes() > 0) return null;

  const user = await db.users.where('username').equals(username).first();
  const ok = !!user && compareSync(password, user.passwordHash);

  if (!ok) {
    const state = readAttempts();
    const count = state.count + 1;
    writeAttempts({
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MINUTES * 60000 : null,
    });
    return null;
  }

  writeAttempts({ count: 0, lockedUntil: null });

  const session: AuthSession = {
    userId: user!.id!,
    username: user!.username,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function getLocalSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; } catch { return null; }
}

export function localLogout() {
  localStorage.removeItem(AUTH_KEY);
}

/** Cria o administrador local padrão caso ainda não exista. */
export async function ensureLocalAdmin(username = 'admin', password = 'Capricha@2026') {
  const existing = await db.users.where('username').equals(username).first();
  if (existing) return existing.id!;
  return db.users.add({
    username,
    passwordHash: hashSync(password, 10),
    createdAt: new Date(),
  });
}

export async function changePassword(userId: number, newPassword: string) {
  await db.users.update(userId, { passwordHash: hashSync(newPassword, 10) });
}
