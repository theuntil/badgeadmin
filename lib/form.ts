// Form okuma, doğrulama ve saat dilimi yardımcıları

export const TZ = process.env.ADMIN_TIMEZONE || 'Europe/Istanbul';

export class FormError extends Error {}

export const str = (f: FormData, k: string, max = 2000) => {
  const v = String(f.get(k) ?? '').trim();
  if (v.length > max) throw new FormError(`"${k}" en fazla ${max} karakter olabilir.`);
  return v;
};
export const strOrNull = (f: FormData, k: string, max = 2000) => str(f, k, max) || null;
export const bool = (f: FormData, k: string) => f.get(k) === 'on' || f.get(k) === 'true';
export const int = (f: FormData, k: string, { min = -1e9, max = 1e9, fallback = 0 } = {}) => {
  const v = parseInt(String(f.get(k) ?? ''), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};
export const intOrNull = (f: FormData, k: string) => {
  const s = String(f.get(k) ?? '').trim();
  if (!s) return null;
  const v = parseInt(s, 10);
  return Number.isFinite(v) && v >= 0 ? v : null;
};
export const lines = (f: FormData, k: string) =>
  str(f, k, 4000).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);

export const uuid = (f: FormData, k: string) => {
  const v = str(f, k, 64);
  if (!/^[0-9a-f-]{36}$/i.test(v)) throw new FormError('Geçersiz kayıt.');
  return v;
};

export function url(f: FormData, k: string, { required = false, label = 'Link' } = {}) {
  const v = str(f, k, 1000);
  if (!v) {
    if (required) throw new FormError(`${label} gerekli.`);
    return null;
  }
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    return u.toString();
  } catch {
    throw new FormError(`${label} geçerli bir adres değil (https:// ile başlamalı).`);
  }
}

export const VERSION_RE = /^\d{1,4}(\.\d{1,4}){0,2}$/;
export function version(f: FormData, k: string, label: string) {
  const v = str(f, k, 20);
  if (!VERSION_RE.test(v)) throw new FormError(`${label} 1.2.3 biçiminde olmalı.`);
  return v;
}

function tzOffsetMs(utcMs: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}

export function localToIso(v: string): string | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return new Date(guess - tzOffsetMs(guess)).toISOString();
}

export function isoToLocal(iso: string | null | undefined) {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  return new Date(ms + tzOffsetMs(ms)).toISOString().slice(0, 16);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function fmtRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });
  if (diff < 60) return 'az önce';
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}
