import { describe, expect, it } from 'vitest';
import {
  normalizePhone,
  normalizeSocialAccount,
  normalizeUrl,
} from '../src/lib/normalize';

describe('normalizePhone', () => {
  it('canonicalizes all common Palestinian formats to +970...', () => {
    expect(normalizePhone('+970599123456')).toBe('+970599123456');
    expect(normalizePhone('00970599123456')).toBe('+970599123456');
    expect(normalizePhone('970599123456')).toBe('+970599123456');
    expect(normalizePhone('0599123456')).toBe('+970599123456');
    expect(normalizePhone('+970 599-123-456')).toBe('+970599123456');
    expect(normalizePhone('0599 123 456')).toBe('+970599123456');
    expect(normalizePhone('(0599) 123.456')).toBe('+970599123456');
  });

  it('handles +970 followed by a redundant 0', () => {
    expect(normalizePhone('+9700599123456')).toBe('+970599123456');
  });

  it('collapses +972 (Israeli carrier routing) to the +970 canonical form', () => {
    expect(normalizePhone('00972521112233')).toBe('+970521112233');
    expect(normalizePhone('+972-52-111-2233')).toBe('+970521112233');
    // A number reported under one country code matches a call from the other.
    expect(normalizePhone('+972593202630')).toBe(normalizePhone('+970593202630'));
  });
});

describe('normalizeUrl', () => {
  it('lowercases host, strips scheme, www and trailing slash', () => {
    expect(normalizeUrl('HTTPS://WWW.Example.COM/Path/')).toBe('example.com/Path');
    expect(normalizeUrl('bit.ly/xy')).toBe('bit.ly/xy');
    expect(normalizeUrl('https://bit.ly/xy')).toBe('bit.ly/xy');
    expect(normalizeUrl('http://bit.ly/xy/')).toBe('bit.ly/xy');
  });

  it('keeps the query string', () => {
    expect(normalizeUrl('https://evil.top/claim?id=5')).toBe('evil.top/claim?id=5');
  });
});

describe('normalizeSocialAccount', () => {
  it('lowercases and strips a leading @', () => {
    expect(normalizeSocialAccount('@Gaza_Cheap_Phones')).toBe('gaza_cheap_phones');
    expect(normalizeSocialAccount('gaza_cheap_phones')).toBe('gaza_cheap_phones');
  });
});
