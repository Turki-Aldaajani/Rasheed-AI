import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHouseholdProfile } from '@/lib/household';

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockUpdate = vi.fn();
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

describe('lib/household.ts - getHouseholdProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Unauthenticated') });

    const result = await getHouseholdProfile();
    expect(result).toBeNull();
  });

  it('returns existing household if present', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-uuid-1' } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'household-uuid-1', city: 'Riyadh' },
      error: null,
    });

    const result = await getHouseholdProfile();
    expect(result).toEqual({ id: 'household-uuid-1', city: 'Riyadh' });
    expect(mockFrom).toHaveBeenCalledWith('households');
  });

  it('auto-creates a default household if user has no household', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-uuid-new' } },
      error: null,
    });
    // First query returns null data
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    // Insert returns newly created household
    mockSingle.mockResolvedValueOnce({
      data: { id: 'household-uuid-created' },
      error: null,
    });

    const result = await getHouseholdProfile();
    expect(result).toEqual({ id: 'household-uuid-created' });
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-uuid-new' });
  });

  it('returns null if auto-creation fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-uuid-err' } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const result = await getHouseholdProfile();
    expect(result).toBeNull();
  });
});
