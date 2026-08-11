import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, signup, logout } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Setup mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns error if missing fields', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      // Missing password

      const result = await login({}, formData);
      expect(result).toEqual({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
    });

    it('returns error on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid login credentials' },
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'wrong');

      const result = await login({}, formData);
      expect(result).toEqual({ error: 'بيانات الدخول غير صحيحة' });
    });

    it('redirects to /app on successful login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'correct');

      await login({}, formData);
      expect(redirect).toHaveBeenCalledWith('/app');
    });
  });

  describe('signup', () => {
    it('returns error if missing fields', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      const result = await signup({}, formData);
      expect(result).toEqual({ error: 'الرجاء تعبئة جميع الحقول المطلوبة' });
    });

    it('redirects to /app if session is created immediately', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { session: { user: { id: '1' } } },
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('displayName', 'Test User');

      await signup({}, formData);
      expect(redirect).toHaveBeenCalledWith('/app');
    });

    it('returns success message if email confirmation is required', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { session: null }, // No session = confirmation required
        error: null,
      });

      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('displayName', 'Test User');

      const result = await signup({}, formData);
      expect(result).toEqual({
        success: true,
        message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.',
      });
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('calls signOut and redirects to /', async () => {
      mockSignOut.mockResolvedValueOnce({});
      await logout();
      expect(mockSignOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/');
    });
  });
});
