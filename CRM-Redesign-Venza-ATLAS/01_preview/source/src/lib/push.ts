import { store } from './mock/store';
import { time } from './format';

/**
 * Уведомления установленного приложения.
 *
 * В превью нет сервера, поэтому настоящий web-push (подписка + VAPID + отправка
 * с бэкенда) показать нечем. Зато системное уведомление можно показать локально:
 * разрешение, вид карточки на экране блокировки, иконка, цифра на значке и переход
 * по тапу — всё то же самое, что увидит риелтор, когда канал подключат в CRM.
 * Отличие одно: настоящее приходит, когда приложение закрыто, это — по нажатию.
 *
 * iPhone разрешает уведомления только установленному приложению: в Safari
 * во вкладке API есть, но разрешение не выдаётся. Поэтому состояние среды
 * считаем отдельно и говорим человеку, чего именно не хватает.
 */
export type PushState =
  | { ok: true; permission: NotificationPermission }
  | { ok: false; why: 'unsupported' | 'insecure' | 'needs-install' };

const iOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Приложение открыто с «Домой», а не во вкладке браузера. */
export const installed = () =>
  matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function pushState(): PushState {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return { ok: false, why: 'unsupported' };
  if (!isSecureContext) return { ok: false, why: 'insecure' };
  if (iOS() && !installed()) return { ok: false, why: 'needs-install' };
  return { ok: true, permission: Notification.permission };
}

/** Текст уведомления берём из данных CRM — на показе видно настоящее событие, а не «тест 123». */
function demoText(): { title: string; body: string; url: string } {
  const now = Date.now();
  const soon = [...store.db.events]
    .filter((e) => new Date(e.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  if (soon) {
    const client = store.db.clients.find((c) => c.id === soon.clientId);
    return { title: 'Показ скоро', body: `${soon.title} · ${time(soon.startsAt)}${client ? ` · ${client.fullName}` : ''}`, url: '#/calendar' };
  }
  const overdue = store.db.tasks.find((t) => !t.completedAt && new Date(t.dueAt).getTime() < now);
  if (overdue) return { title: 'Просроченная задача', body: `${overdue.title} · срок прошёл`, url: '#/tasks' };
  return { title: 'On Top Property', body: 'Проверочное уведомление из CRM', url: '#/today' };
}

const asset = (name: string) => new URL(name, document.baseURI).href;

/**
 * Спрашивает разрешение (только по нажатию — иначе iOS окно не покажет)
 * и показывает уведомление через сервис-воркер: так по тапу открывается
 * нужный экран, а не просто окно приложения.
 */
export async function showDemoNotification(): Promise<'shown' | 'denied' | 'failed'> {
  const state = pushState();
  if (!state.ok) return 'failed';
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.ready;
    const { title, body, url } = demoText();
    await reg.showNotification(title, {
      body,
      icon: asset('icon-192.png'),
      badge: asset('icon-192.png'),
      tag: 'otp-demo',
      data: { url: new URL(url, document.baseURI).href },
    });
    // Цифра на значке приложения — как у почты. Снимается, когда CRM открывают снова.
    const bell = store.db.tasks.filter((t) => !t.completedAt && new Date(t.dueAt).getTime() < Date.now()).length;
    await (navigator as unknown as { setAppBadge?: (n: number) => Promise<void> }).setAppBadge?.(Math.min(9, bell) || 1);
    return 'shown';
  } catch { return 'failed'; }
}

/** При открытии приложения значок гасим — уведомления уже разобраны. */
export function clearAppBadge() {
  void (navigator as unknown as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
}
