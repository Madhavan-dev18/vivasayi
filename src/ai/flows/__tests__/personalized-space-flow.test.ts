import { describe, it, expect, vi } from 'vitest';
import { getPersonalizedCultivationPlan } from '../personalized-space-flow';
import { withGeminiRetry } from '@/ai/with-retry';

vi.mock('@/ai/genkit', () => ({ ai: { defineFlow: vi.fn((_opts: any, fn: any) => fn), generate: vi.fn() } }));
vi.mock('@/ai/with-retry', () => ({ withGeminiRetry: vi.fn() }));

describe('personalized-space-flow', () => {
  it('should return a cultivation plan on success', async () => {
    const mockOutput = {
      cultivationPlan: [
        {
          stage: 'Land Preparation',
          tasks: 'Plough the field and apply manure.',
          iconName: 'Tractor',
          dailyTasks: [
            {
              day: 'Monday',
              tasks: 'Plough field',
              iconName: 'Tractor',
            },
          ],
        },
      ],
    };
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: mockOutput });

    const result = await getPersonalizedCultivationPlan({
      crop: 'Rice',
      district: 'Vellore',
      sowingDate: '2026-07-15',
      userProfile: 'Experienced farmer',
    });

    expect(result).toEqual(mockOutput);
    expect(withGeminiRetry).toHaveBeenCalled();
  });

  it('should throw an error if model returns no structured output', async () => {
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: null });

    await expect(
      getPersonalizedCultivationPlan({
        crop: 'Rice',
        district: 'Vellore',
        sowingDate: '2026-07-15',
        userProfile: 'Experienced farmer',
      })
    ).rejects.toThrow('AI failed to return a formatted cultivation plan.');
  });
});
