import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock Next.js Server Components
vi.mock('next/server', () => {
  const redirect = vi.fn((url: URL | string) => ({ status: 307, headers: new Headers({ Location: url.toString() }) }));
  const next = vi.fn(() => ({ cookies: { set: vi.fn(), get: vi.fn(), getAll: vi.fn() } }));
  return {
    NextResponse: { redirect, next },
    NextRequest: class NextRequest {
      nextUrl: any;
      cookies: any;
      constructor(url: string) {
        const parsed = new URL(url);
        this.nextUrl = parsed;
        this.nextUrl.clone = () => new URL(parsed.toString());
        this.cookies = { getAll: vi.fn(() => []), set: vi.fn() };
      }
    }
  };
});

// Setup mock Supabase client
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user accessing /app to /login securely (no open redirect)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = new NextRequest('http://localhost:3000/app');
    
    const res = await updateSession(req);
    
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = (NextResponse.redirect as any).mock.calls[0][0];
    expect(redirectedUrl.pathname).toBe('/login');
    expect(redirectedUrl.host).toBe('localhost:3000'); // Validates it stays on same origin
  });

  it('redirects authenticated user accessing /login to /app securely (no open redirect)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: '1' } } });
    const req = new NextRequest('http://localhost:3000/login');
    
    const res = await updateSession(req);
    
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = (NextResponse.redirect as any).mock.calls[0][0];
    expect(redirectedUrl.pathname).toBe('/app');
    expect(redirectedUrl.host).toBe('localhost:3000');
  });

  it('allows public Demo / route to pass without authentication', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = new NextRequest('http://localhost:3000/');
    
    await updateSession(req);
    
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
