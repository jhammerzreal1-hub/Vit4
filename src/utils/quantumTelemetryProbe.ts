export interface SpectralTelemetryResult {
  count: number;
  mean: number;
  peak: number;
  rmsEnergy: number;
}

export function computeSpectralTelemetry(samples: number[]): SpectralTelemetryResult {
  const count = samples.length;
  if (count === 0) {
    return { count: 0, mean: 0, peak: 0, rmsEnergy: 0 };
  }

  let sum = 0;
  let sumSquares = 0;
  let peak = Number.NEGATIVE_INFINITY;

  for (const sample of samples) {
    sum += sample;
    sumSquares += sample * sample;
    if (sample > peak) {
      peak = sample;
    }
  }

  return {
    count,
    mean: sum / count,
    peak,
    rmsEnergy: Math.sqrt(sumSquares / count),
  };
}
