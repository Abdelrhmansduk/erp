import { describe, it, expect } from 'vitest';
import { isLocalHost, isRemoteEnvironment } from './supabaseClient';

describe('Supabase Client & CORS Loopback Protection', () => {
  it('should identify local loopback URLs accurately', () => {
    expect(isLocalHost('http://127.0.0.1:54421')).toBe(true);
    expect(isLocalHost('http://localhost:3000')).toBe(true);
    expect(isLocalHost('http://0.0.0.0:8000')).toBe(true);
    expect(isLocalHost('https://xyz.supabase.co')).toBe(false);
  });

  it('should recognize environment types safely', () => {
    expect(typeof isRemoteEnvironment()).toBe('boolean');
  });
});
