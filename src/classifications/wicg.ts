import type { ConnectionClassification } from '../types.ts';

/**
 * WICG Network Information API specification
 * @see https://wicg.github.io/netinfo/
 */
export const CLASSIFICATION = [
  {
    type: 'slow-2g',
    maxDownlink: 0.05, // < 50 kbps
    minRtt: 1400, // > 1400ms
    description: 'Very slow connection, text-only pages'
  },
  {
    type: '2g',
    maxDownlink: 0.07, // < 70 kbps
    minRtt: 270, // > 270ms
    description: 'Slow connection, small images'
  },
  {
    type: '3g',
    maxDownlink: 0.7, // < 700 kbps
    description: 'Moderate connection, high-res images, audio'
  },
  {
    type: '4g',
    description: 'Fast connection, HD video, real-time features'
  }
] as const satisfies ConnectionClassification[];
