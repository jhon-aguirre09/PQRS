import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('PQRS routes', () => {
  it('exposes registration, login and protected request workflows', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('login');
    expect(paths).toContain('register');
    expect(paths).toContain('dashboard');
    expect(paths).toContain('requests/new');
    expect(routes.find((route) => route.path === 'dashboard')?.canActivate?.length).toBe(1);
  });
});
