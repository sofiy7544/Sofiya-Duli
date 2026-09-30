import type { Channel } from './types';

const USERNAME = /^@?([A-Za-z0-9_.]{3,64})$/;

function safeHttps(value: string, hosts: string[]): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    return hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Строит ссылку только из значения, которое уже сохранено в CRM.
 * Никаких запросов к внешним сервисам; неизвестные схемы и домены отбрасываются (защита от XSS).
 */
export function channelUrl(channel: Channel, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  switch (channel) {
    case 'facebook':
      if (/^https?:\/\//i.test(v)) return safeHttps(v.replace(/^http:/i, 'https:'), ['facebook.com', 'fb.com']);
      return USERNAME.test(v) ? `https://www.facebook.com/${encodeURIComponent(v.replace(/^@/, ''))}` : null;
    case 'messenger':
      if (/^https?:\/\//i.test(v)) return safeHttps(v.replace(/^http:/i, 'https:'), ['m.me', 'messenger.com', 'facebook.com']);
      return USERNAME.test(v) ? `https://m.me/${encodeURIComponent(v.replace(/^@/, ''))}` : null;
    case 'telegram': {
      if (/^https?:\/\//i.test(v)) return safeHttps(v.replace(/^http:/i, 'https:'), ['t.me', 'telegram.me']);
      const m = USERNAME.exec(v);
      return m ? `https://t.me/${encodeURIComponent(m[1]!)}` : null;
    }
    case 'whatsapp': {
      if (/^https?:\/\//i.test(v)) return safeHttps(v.replace(/^http:/i, 'https:'), ['wa.me', 'whatsapp.com']);
      const digits = v.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
    }
    case 'viber':
      // viber:// диплинки открывают внешнее приложение — показываем значение без ссылки
      return null;
  }
}
