import type { ConnectionClassification } from '../types.ts';

/**
 * Chrome DevTools throttling (similar to Lighthouse)
 */
export default [
    {
        type: 'slow-2g',
        maxDownlink: 0.05, // 50 kbps
        minRtt: 2000, // 2000ms
        description: 'Slow 2G (50 kbps, 2000ms RTT)',
    },
    {
        type: '2g',
        maxDownlink: 0.07, // 70 kbps
        minRtt: 1400, // 1400ms
        description: '2G (70 kbps, 1400ms RTT)',
    },
    {
        type: '3g',
        maxDownlink: 1.6, // 1.6 Mbps
        minRtt: 300, // 300ms
        description: 'Regular 3G (1.6 Mbps, 300ms RTT)',
    },
    {
        type: '4g',
        description: 'Regular 4G+ (9+ Mbps, 170ms RTT)',
    },
] as ConnectionClassification[];
//] as const satisfies ConnectionClassification[];
