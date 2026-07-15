import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdvancedPrediction } from '@/hooks/useAdvancedPrediction';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAdvancedPrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch predictions successfully', async () => {
    const mockPredictions = {
      predictions: [
        {
          numbers: [1, 15, 30, 45, 60],
          confidence: 0.85,
          algorithm: 'FrequencyPro',
          factors: ['Fréquence', 'Pondération'],
          score: 0.72,
          category: 'statistical',
        },
      ],
      selectedAlgorithm: 'FrequencyPro',
      dataMetrics: {
        quality: 0.8,
        freshness: 0.9,
        historicalCount: 100,
      },
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockPredictions,
      error: null,
    });

    const { result } = renderHook(() => useAdvancedPrediction('Etoile'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPredictions);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('advanced-ai-prediction-v2', {
      body: { drawName: 'Etoile', useSmartEnsemble: false, useAIOrchestration: false },
    });
  });

  it('should handle WORKER_LIMIT error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: new Error('WORKER_LIMIT exceeded'),
    });

    const { result } = renderHook(() => useAdvancedPrediction('Etoile'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('WORKER_LIMIT');
  });

  it('should clean up prediction numbers', async () => {
    const mockPredictions = {
      predictions: [
        {
          numbers: [1, 95, 15, 0, 30], // Invalid numbers: 95 > 90, 0 < 1
          confidence: 0.85,
          algorithm: 'Test',
          factors: [],
          score: 0.7,
          category: 'statistical',
        },
      ],
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockPredictions,
      error: null,
    });

    const { result } = renderHook(() => useAdvancedPrediction('Etoile'), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const cleanedNumbers = result.current.data?.predictions[0].numbers || [];
    expect(cleanedNumbers.every((n: number) => n >= 1 && n <= 90)).toBe(true);
  });

  it('should not fetch when drawName is empty', () => {
    const { result } = renderHook(() => useAdvancedPrediction(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should use caching correctly', async () => {
    const mockPredictions = {
      predictions: [
        {
          numbers: [1, 15, 30, 45, 60],
          confidence: 0.85,
          algorithm: 'FrequencyPro',
          factors: [],
          score: 0.72,
          category: 'statistical',
        },
      ],
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockPredictions,
      error: null,
    });

    const wrapper = createWrapper();

    // First render
    const { result: result1 } = renderHook(() => useAdvancedPrediction('Etoile'), {
      wrapper,
    });

    await vi.waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second render with same drawName - should use cache
    const { result: result2 } = renderHook(() => useAdvancedPrediction('Etoile'), {
      wrapper,
    });

    expect(result2.current.data).toEqual(mockPredictions);
    // Should only have been called once due to caching
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });
});
