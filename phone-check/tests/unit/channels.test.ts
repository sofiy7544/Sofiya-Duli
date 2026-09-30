import { describe, expect, it } from 'vitest';
import { channelUrl } from '@/lib/channels';

describe('channelUrl — ссылки только из сохранённых значений', () => {
  it('строит ссылки на известные домены', () => {
    expect(channelUrl('telegram', '@shop_client')).toBe('https://t.me/shop_client');
    expect(channelUrl('telegram', 'https://t.me/shop_client')).toBe('https://t.me/shop_client');
    expect(channelUrl('facebook', 'https://www.facebook.com/client.1')).toBe('https://www.facebook.com/client.1');
    expect(channelUrl('facebook', 'http://facebook.com/client')).toBe('https://facebook.com/client');
    expect(channelUrl('messenger', 'client1')).toBe('https://m.me/client1');
    expect(channelUrl('whatsapp', '+380 67 123 45 67')).toBe('https://wa.me/380671234567');
  });

  it('отбрасывает опасные схемы и чужие домены', () => {
    expect(channelUrl('facebook', 'javascript:alert(1)')).toBeNull();
    expect(channelUrl('facebook', 'https://evil.example/facebook.com')).toBeNull();
    expect(channelUrl('facebook', 'https://facebook.com.evil.example/x')).toBeNull();
    expect(channelUrl('telegram', 'https://evil.example/t.me')).toBeNull();
    expect(channelUrl('telegram', '<script>')).toBeNull();
    expect(channelUrl('whatsapp', 'data:text/html,hi')).toBeNull();
  });

  it('Viber показывается без ссылки', () => {
    expect(channelUrl('viber', '+380671234567')).toBeNull();
  });
});
