import type { ConnectionClassification } from '../types.ts';

/**
 * Firefox DevTools throttling classification
 * @see https://github.com/mozilla-firefox/firefox/blob/main/devtools/docs/user/network_monitor/throttling/index.rst
 */
export const CLASSIFICATION = [
  {
    type: 'slow-2g',
    maxDownlink: 0.05, // 50 kbps
    minRtt: 2000, // 2000ms
    description: 'GPRS (50 kbps, 2000ms RTT)'
  },
  {
    type: '2g',
    maxDownlink: 0.25, // 250 kbps
    minRtt: 800, // 800ms
    description: 'Regular 2G (250 kbps, 800ms RTT)'
  },
  {
    type: '3g',
    maxDownlink: 0.75, // 750 kbps
    minRtt: 200, // 200ms
    description: 'Good 2G (450 kbps, 150ms RTT) / Regular 3G (750 kbps, 200ms RTT)'
  },
  {
    type: '4g',
    description: 'Good 3G+ (1.5+ Mbps, 40ms RTT)'
  }
] as const satisfies ConnectionClassification[];
