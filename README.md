# Network Information API polyfill

[![JSR](https://jsr.io/badges/@esroyo/network-information-api-polyfill)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![JSR Score](https://jsr.io/badges/@esroyo/network-information-api-polyfill/score)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![ci](https://github.com/esroyo/network-information-api-polyfill/actions/workflows/ci.yml/badge.svg)](https://github.com/esroyo/network-information-api-polyfill/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/esroyo/network-information-api-polyfill/graph/badge.svg?token=YO7XY0TDX5)](https://codecov.io/gh/esroyo/network-information-api-polyfill)

A polyfill for the [W3C Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API) that provides real-time network connection information when the native API is not available.

## Features

- 🚀 **Automatic installation** - Just import and use with WICG classification
- 📊 **Real-time measurements** - Active network speed testing using Cloudflare's infrastructure
- ⚡ **Lightweight** - Less than **3kB** minified and compressed
- 🎯 **Multiple classification standards** - WICG, Firefox DevTools, Chrome DevTools, or custom
- 🌳 **Tree-shakeable** - Import only what you need
- 🔧 **Fully configurable** - Customize thresholds and measurement parameters

## Quick start

### Try it now (no installation!)
**[Live playground](https://esroyo.github.io/network-information-api-polyfill/) →**

Or test in browser console:
```javascript
import('https://esm.sh/jsr/@esroyo/network-information-api-polyfill').then(() => {
    navigator.connection?.addEventListener('change', (e) => {
        console.log('🔄 Network changed:', e.detail);
    });
});
```

### Installation

**Automatic (recommended for most users):**
```typescript
import '@esroyo/network-information-api-polyfill';

// Now available on navigator
navigator.connection?.addEventListener('change', (event) => {
    console.log('Network:', event.detail.effectiveType, event.detail.downlink + 'Mbps');
});
```

**Manual with tree-shaking:**
```typescript
import { installNetworkInformationPolyfill } from '@esroyo/network-information-api-polyfill/pure';
import CLASSIFICATION_FIREFOX from '@esroyo/network-information-api-polyfill/classifications/firefox';

installNetworkInformationPolyfill({
    classificationTable: CLASSIFICATION_FIREFOX,
    measurementCount: 3,
    periodicMeasurement: true
});
```

**Standalone instance:**
```typescript
import { createNetworkInformation } from '@esroyo/network-information-api-polyfill/network-information';
import CLASSIFICATION_CHROME from '@esroyo/network-information-api-polyfill/classifications/chrome';

const networkApi = createNetworkInformation({
    classificationTable: CLASSIFICATION_CHROME,
    periodicMeasurement: true
});

networkApi.addEventListener('change', (event) => {
    console.log('Network changed:', event.detail);
});
```

## ⚠️ DevTools throttling limitation

**This polyfill may not reflect throttled speeds when using browser DevTools network throttling.**

DevTools throttling is applied synthetically, but this polyfill uses the **Performance Resource Timing API** which reports actual network timings, not artificial throttling.

**For accurate testing:** Use real mobile networks, network-level throttling, or deploy to staging environments.

## API reference

### Properties
- `downlink`: Downlink speed in Mbps
- `uplink`: Uplink speed in Mbps (estimated)
- `rtt`: Round-trip time in milliseconds
- `effectiveType`: Connection classification (`'slow-2g'`, `'2g'`, `'3g'`, `'4g'`)
- `saveData`: Whether data saving mode is enabled
- `type`: Connection type (always `'unknown'` in polyfill)

### Methods
- `measure()`: Manually trigger a network measurement
- `getConnectionInfo()`: Get current connection information
- `dispose()`: Clean up resources and stop periodic measurements
- `addEventListener()` / `removeEventListener()`: Event handling

### Configuration
```typescript
interface NetworkInformationConfig {
    classificationTable: ConnectionClassification[]; // Required
    origin?: string; // Default: 'https://speed.cloudflare.com'
    measurementCount?: number; // Default: 2
    baseMeasurementSize?: number; // Default: 100000 bytes
    measurementSizeMultiplier?: number; // Default: 2
    periodicMeasurement?: boolean; // Default: false
    measurementInterval?: number; // Default: 30000ms
    estimatedServerTime?: number; // Default: 10ms
    estimatedHeaderFraction?: number; // Default: 0.005
}
```

## Classification standards

### WICG (Default)
Based on the [official specification](https://wicg.github.io/netinfo/):

| Type      | Max Downlink | Min RTT   | Description                  |
| --------- | ------------ | --------- | ---------------------------- |
| `slow-2g` | < 50 kbps    | > 1400ms  | Very slow connection         |
| `2g`      | < 70 kbps    | > 270ms   | Slow connection              |
| `3g`      | < 700 kbps   | -         | Moderate connection          |
| `4g`      | -            | -         | Fast connection              |

### Firefox DevTools / Chrome DevTools
```typescript
import CLASSIFICATION_FIREFOX from '@esroyo/network-information-api-polyfill/classifications/firefox';
import CLASSIFICATION_CHROME from '@esroyo/network-information-api-polyfill/classifications/chrome';
```

Different thresholds based on browser DevTools standards. See the [classification files](./src/classifications/) for detailed specifications.

### Custom classifications
```typescript
const customClassification = [
    { type: 'slow-2g', maxDownlink: 0.1, minRtt: 1000 },
    { type: '2g', maxDownlink: 0.5, minRtt: 500 },
    { type: '3g', maxDownlink: 2.0, minRtt: 200 },
    { type: '4g' }
];
```

## Performance tips

- Use `measurementCount: 1` for minimal bandwidth usage
- Call `dispose()` to prevent memory leaks
- Balance accuracy vs. resource usage with appropriate intervals

## Browser compatibility

Modern browsers with fetch API support.

## Contributing

Contributions welcome! Especially new classification standards, bundle optimizations, and performance improvements.

## License

MIT License - see [LICENSE](LICENSE) file for details.
