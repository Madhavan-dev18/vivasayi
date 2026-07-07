import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withGeminiRetry } from '../with-retry';

describe('withGeminiRetry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Mock setTimeout to invoke the callback immediately to avoid real delays and fake timer issues
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return value directly when the call succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success-data');
    const result = await withGeminiRetry(fn);
    expect(result).toBe('success-data');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors and succeed if a later attempt succeeds', async () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('[503 Service Unavailable] overloaded');
      })
      .mockResolvedValueOnce('success-after-retry');

    const result = await withGeminiRetry(fn, { retries: 2, baseDelayMs: 10 });
    
    expect(result).toBe('success-after-retry');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry up to specified limit and then throw the last error', async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('[503 Service Unavailable] overloaded');
    });
    
    await expect(
      withGeminiRetry(fn, { retries: 2, baseDelayMs: 10 })
    ).rejects.toThrow('overloaded');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should throw immediately and not retry for non-retryable status codes', async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error('[400 Bad Request] Invalid argument');
    });
    
    await expect(
      withGeminiRetry(fn, { retries: 3, baseDelayMs: 10 })
    ).rejects.toThrow('Invalid argument');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry fallback keywords if no status code is matched', async () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('The service was overloaded, try again');
      })
      .mockResolvedValueOnce('recovered-fallback-keyword');

    const result = await withGeminiRetry(fn, { retries: 2, baseDelayMs: 10 });
    
    expect(result).toBe('recovered-fallback-keyword');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should skip retries on daily quota exhaustion and use the fallback instead', async () => {
    const primaryError = new Error('GenerateRequestsPerDayPerProjectPerModel exceeded your current quota');
    const fn = vi.fn().mockImplementation(async () => {
      throw primaryError;
    });
    const fallback = vi.fn().mockResolvedValue('fallback-result');

    const result = await withGeminiRetry(fn, {
      retries: 3,
      baseDelayMs: 10,
      fallback,
    });

    expect(result).toBe('fallback-result');
    expect(fn).toHaveBeenCalledTimes(1); // did not retry primary
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('should propagate the original error if the fallback also fails', async () => {
    const primaryError = new Error('GenerateRequestsPerDayPerProjectPerModel exceeded your current quota');
    const fn = vi.fn().mockImplementation(async () => {
      throw primaryError;
    });
    const fallback = vi.fn().mockImplementation(async () => {
      throw new Error('Fallback also failed');
    });

    await expect(
      withGeminiRetry(fn, {
        retries: 3,
        baseDelayMs: 10,
        fallback,
      })
    ).rejects.toThrow('GenerateRequestsPerDayPerProjectPerModel');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
