import { describe, it, expect, vi } from 'vitest';
import { detectPlantDisease } from '../disease-detection-flow';
import { withGeminiRetry } from '@/ai/with-retry';

vi.mock('@/ai/genkit', () => ({ ai: { definePrompt: vi.fn(), defineFlow: vi.fn((_opts: any, fn: any) => fn) } }));
vi.mock('@/ai/with-retry', () => ({ withGeminiRetry: vi.fn() }));

describe('disease-detection-flow', () => {
  it('should return disease detection output on success', async () => {
    const mockOutput = {
      disease: 'Late Blight',
      confidence: 90,
      treatment: 'Apply copper-based fungicides.',
      description: 'Found dark water-soaked spots on leaves.'
    };
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: mockOutput });

    const result = await detectPlantDisease({
      photoDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      language: 'English',
    });

    expect(result).toEqual(mockOutput);
    expect(withGeminiRetry).toHaveBeenCalled();
  });

  it('should throw an error if model returns no structured output', async () => {
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: null });

    await expect(
      detectPlantDisease({
        photoDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        language: 'English',
      })
    ).rejects.toThrow('Disease detection failed: the model returned no structured output.');
  });
});
