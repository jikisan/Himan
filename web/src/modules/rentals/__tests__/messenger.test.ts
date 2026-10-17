import { describe, expect, it } from 'vitest';
import { messengerLabel, messengerUrl } from '../presentation/utils/messenger';

describe('messengerUrl', () => {
  it('keeps profile and Messenger links', () => {
    expect(messengerUrl('https://www.facebook.com/juan.dc')).toBe('https://www.facebook.com/juan.dc');
    expect(messengerUrl('facebook.com/juan.dc')).toBe('https://facebook.com/juan.dc');
    expect(messengerUrl('m.me/juan.dc')).toBe('https://m.me/juan.dc');
  });
  it('opens a chat for a username and searches for a name', () => {
    expect(messengerUrl('@juan.delacruz')).toBe('https://m.me/juan.delacruz');
    expect(messengerUrl('Juan Dela Cruz')).toBe('https://www.facebook.com/search/top?q=Juan%20Dela%20Cruz');
  });
  it('never makes a non-web link', () => {
    expect(messengerUrl('javascript:alert(1)')).toBe('https://www.facebook.com/search/top?q=javascript%3Aalert(1)');
    expect(messengerUrl('  ')).toBeNull();
  });
});

describe('messengerLabel', () => {
  it('shows a username or the kind of link instead of a long URL', () => {
    expect(messengerLabel('https://www.messenger.com/e2ee/t/7493840129384712/?ref=abc&tracking=xyz')).toBe('Messenger chat');
    expect(messengerLabel('https://www.messenger.com/t/juan.dc')).toBe('@juan.dc');
    expect(messengerLabel('https://www.facebook.com/profile.php?id=100089123456789')).toBe('Facebook profile');
    expect(messengerLabel('facebook.com/juan.dc?mibextid=ZbWKwL')).toBe('@juan.dc');
    expect(messengerLabel('m.me/juan.dc')).toBe('@juan.dc');
    expect(messengerLabel('Juan Dela Cruz')).toBe('Juan Dela Cruz');
  });
});
