import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSignedFileUrl } from '../storage-actions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Use vi.hoisted so these mocks are available when vi.mock is hoisted
const { mockCreateSignedUrl, mockFrom } = vi.hoisted(() => ({
  mockCreateSignedUrl: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    storage: {
      from: mockFrom,
    },
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
  }),
}));

describe('storage-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });
  });

  it('should return a signed URL when Supabase successfully generates it', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/signed-url/report.pdf' },
      error: null,
    });

    const url = await getSignedFileUrl('user-123/reports/report.pdf');

    expect(url).toBe('https://supabase.co/signed-url/report.pdf');
    expect(createServerClient).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('vivasayi-storage');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-123/reports/report.pdf', 600);
  });

  it('should return null and log an error when Supabase signed URL creation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: new Error('Access Denied (RLS policy violation)'),
    });

    const url = await getSignedFileUrl('user-123/reports/report.pdf');

    expect(url).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to create signed URL:',
      'Access Denied (RLS policy violation)'
    );
    consoleSpy.mockRestore();
  });
});
