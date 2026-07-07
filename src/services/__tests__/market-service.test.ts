import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getLatestCropPrices, getHistoricalProductionData } from '../market-service';
import { getMarketPrices } from '@/lib/market-price-flow';

vi.mock('@/lib/market-price-flow', () => ({
  getMarketPrices: vi.fn(),
}));

describe('market-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestCropPrices', () => {
    it('should map and return prices from the AI flow on success', async () => {
      vi.mocked(getMarketPrices).mockResolvedValue({
        crops: [
          { name: 'Rice', pricePerQuintal: 2500, percentageChange: 1.5 },
        ],
        seeds: [],
        status: 'Success',
      });

      const prices = await getLatestCropPrices('Rice', 'Tamil Nadu');

      expect(prices).toHaveLength(1);
      expect(prices[0]).toEqual({
        commodity: 'Rice',
        market: 'Tamil Nadu Mandi (AI estimate)',
        modal_price: 2500,
        min_price: 2250, // 2500 * 0.9
        max_price: 2750, // 2500 * 1.1
        date: expect.any(String),
      });
    });

    it('should fall back to hardcoded crop prices if AI flow returns no crops', async () => {
      vi.mocked(getMarketPrices).mockResolvedValue({
        crops: [],
        seeds: [],
        status: 'No crops found',
      });

      const prices = await getLatestCropPrices('Rice', 'Tamil Nadu');
      expect(prices.length).toBeGreaterThan(0);
      expect(prices[0].market).not.toContain('(AI estimate)');
    });

    it('should fall back to hardcoded crop prices if AI flow throws an error', async () => {
      vi.mocked(getMarketPrices).mockRejectedValue(new Error('AI Service Down'));

      const prices = await getLatestCropPrices('Rice', 'Tamil Nadu');
      expect(prices.length).toBeGreaterThan(0);
      expect(prices[0].market).not.toContain('(AI estimate)');
    });
  });

  describe('getHistoricalProductionData', () => {
    it('should return matched records for a valid district and season', async () => {
      const result = await getHistoricalProductionData('Vellore', 'Kharif');
      expect(result.length).toBeGreaterThan(0);
      result.forEach((record) => {
        expect(record.district.toLowerCase()).toBe('vellore');
        expect(record.season.toLowerCase()).toBe('kharif');
      });
    });

    it('should return all fallback data if no match is found', async () => {
      const result = await getHistoricalProductionData('UnknownDistrict', 'UnknownSeason');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContainEqual(expect.objectContaining({ district: 'Vellore' }));
    });
  });
});
