import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeatherData } from '../weather-service';

describe('weather-service', () => {
  beforeEach(() => {
    vi.stubEnv('WEATHER_API_KEY', '');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should return mock data and log a warning if WEATHER_API_KEY is not set', async () => {
    const data = await getWeatherData('Vellore');
    expect(data.temperature).toBe(28.5);
    expect(data.humidity).toBe(65);
    expect(data.windSpeed).toBe(12.3);
    expect(data.forecast).toBe('partly cloudy');
    expect(data.location).toBe('Vellore');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WEATHER_API_KEY is not set'));
  });

  it('should fetch and return normalized weather data if API key is set and fetch succeeds', async () => {
    vi.stubEnv('WEATHER_API_KEY', 'test-key');

    const mockResponse = {
      main: { temp: 31.2, humidity: 72 },
      wind: { speed: 5.0 }, // 5.0 m/s * 3.6 = 18.0 km/h
      weather: [{ description: 'moderate rain' }],
      name: 'Vellore',
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const data = await getWeatherData('Vellore');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('q=Vellore&appid=test-key'),
      expect.any(Object)
    );
    expect(data).toEqual({
      temperature: 31.2,
      humidity: 72,
      windSpeed: 18.0,
      forecast: 'moderate rain',
      location: 'Vellore',
    });
  });

  it('should return a fallback if fetch returns a non-ok status', async () => {
    vi.stubEnv('WEATHER_API_KEY', 'test-key');

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const data = await getWeatherData('Vellore');

    expect(data.forecast).toBe('data unavailable');
    expect(data.temperature).toBe(28.5);
    expect(console.error).toHaveBeenCalled();
  });

  it('should return a fallback if fetch throws a network error', async () => {
    vi.stubEnv('WEATHER_API_KEY', 'test-key');

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const data = await getWeatherData('Vellore');

    expect(data.forecast).toBe('data unavailable');
    expect(data.temperature).toBe(28.5);
    expect(console.error).toHaveBeenCalled();
  });
});
