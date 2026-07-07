import { describe, it, expect, vi } from 'vitest';
import { getCropRecommendations } from '../crop-recommendations';
import { withGeminiRetry } from '@/ai/with-retry';

vi.mock('@/ai/genkit', () => ({ ai: { definePrompt: vi.fn(), defineFlow: vi.fn((_opts: any, fn: any) => fn), defineTool: vi.fn() } }));
vi.mock('@/services/market-service', () => ({ getHistoricalProductionData: vi.fn() }));
vi.mock('@/ai/with-retry', () => ({ withGeminiRetry: vi.fn() }));

describe('crop-recommendations-flow', () => {
  it('should return crop recommendation output on success', async () => {
    const mockOutput = {
      recommendedCrops: 'Rice, Maize',
      plantingInstructions: 'Sow rice in wet soil, space maize 30cm apart.',
      riskAssessment: 'Watch out for stem borers in rice.',
    };
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: mockOutput });

    const result = await getCropRecommendations({
      soilAnalysis: 'pH 6.5, Clayey',
      weatherData: 'Temp: 30C, Rainfall: High',
      district: 'Vellore',
      season: 'Kharif',
    });

    expect(result).toEqual(mockOutput);
    expect(withGeminiRetry).toHaveBeenCalled();
  });

  it('should throw an error if model returns no structured output', async () => {
    vi.mocked(withGeminiRetry).mockResolvedValue({ output: null });

    await expect(
      getCropRecommendations({
        soilAnalysis: 'pH 6.5, Clayey',
        weatherData: 'Temp: 30C, Rainfall: High',
        district: 'Vellore',
        season: 'Kharif',
      })
    ).rejects.toThrow('Crop recommendation failed: the model returned no structured output.');
  });
});
