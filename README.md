# Network Information API polyfill

[![JSR](https://jsr.io/badges/@esroyo/network-information-api-polyfill)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![JSR Score](https://jsr.io/badges/@esroyo/network-information-api-polyfill/score)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![codecov](https://codecov.io/gh/esroyo/network-information-api-polyfill/graph/badge.svg?token=YO7XY0TDX5)](https://codecov.io/gh/esroyo/network-information-api-polyfill)

A polyfill for the
[W3C Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
that provides real-time network connection information when the native API is
not available.

## Features

- 🚀 **Automatic Installation** - Just import and use with WICG classification
- 📊 **Real-time Measurements** - Active network speed testing using Cloudflare's infrastructure
- ⚡ **Lightweight** - Less than **3kB** compressed, tree-shakeable classifications
- 🎯 **Multiple Classification Standards** - Choose between WICG, Firefox DevTools, Chrome DevTools, or custom tables
- 🌳 **Tree-shakeable** - Import only the classification tables you need
- 🔧 **Fully Configurable** - Customize classification thresholds and measurement parameters
- 🔄 **Periodic Updates** - Optional continuous monitoring of network conditions

## Try it right now (🚀 no installation!)

### Check the [live playground](https://esroyo.github.io/network-information-api-polyfill/) 👉

Or manually test in your browser console in 2 seconds:

```javascript
import('https://esm.sh/jsr/@esroyo/network-information-api-polyfill').then(
    () => {
        // Listen for changes
        navigator.connection?.addEventListener('change', (e) => {
            console.log('🔄 Network changed:', e.detail);
        });
    },
);
```

Open DevTools → Console → Paste → Enter → Magic! ✨

## Installation

### Automatic polyfilling (includes WICG classification)

```typescript
import '@esroyo/network-information-api-polyfill';
```

### Manual installation with tree-shaking

```typescript
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';
// Only import the classification tables you need
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/firefox';

const api = new NetworkInformation({
    classificationTable: CLASSIFICATION, // Required for manual installation
    measurementCount: 3,
    periodicMeasurement: true
});
```

## Usage Examples

### Basic usage (automatic polyfill with WICG classification)

```typescript
// Auto-install with default WICG classification
import '@esroyo/network-information-api-polyfill';

// Now available on navigator
navigator.connection?.addEventListener('change', (event) => {
    console.log('Network changed:', {
        effectiveType: event.detail.effectiveType, // '4g', '3g', '2g', 'slow-2g'
        downlink: event.detail.downlink,           // Mbps
        rtt: event.detail.rtt,                     // milliseconds
    });
});
```

### Manual usage with different classification standards

```typescript
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';
// Tree-shakeable imports - only bundle what you use
import { CLASSIFICATION as CLASSIFICATION_FIREFOX } from '@esroyo/network-information-api-polyfill/classifications/firefox';
import { CLASSIFICATION as CLASSIFICATION_CHROME } from '@esroyo/network-information-api-polyfill/classifications/chrome';

// Firefox DevTools classification
const firefoxApi = new NetworkInformation({
    classificationTable: CLASSIFICATION_FIREFOX, // Must specify classification
    periodicMeasurement: true
});

// Chrome DevTools classification  
const chromeApi = new NetworkInformation({
    classificationTable: CLASSIFICATION_CHROME, // Must specify classification
    measurementCount: 1 // Minimal overhead
});
```

### Custom classification for specific use cases

```typescript
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';

// Gaming-focused classification (latency matters more)
const gamingApi = new NetworkInformation({
    classificationTable: [
        {
            type: 'slow-2g',
            maxDownlink: 0.5,    // 500 kbps
            minRtt: 200,         // 200ms - too high for gaming
            description: 'Unplayable'
        },
        {
            type: '2g',
            maxDownlink: 2.0,    // 2 Mbps
            minRtt: 100,         // 100ms - playable but not ideal
            description: 'Basic gaming'
        },
        {
            type: '3g',
            maxDownlink: 10.0,   // 10 Mbps
            minRtt: 50,          // 50ms - good for most games
            description: 'Good gaming'
        },
        {
            type: '4g',
            description: 'Competitive ready'
        }
    ],
    measurementCount: 1
});
```

## Tree-shakeable Classifications

Import only what you need to keep bundle size minimal:

```typescript
// Option 1: Auto-install (includes WICG classification - ~2.5kB)
import '@esroyo/network-information-api-polyfill';

// Option 2: Manual with specific classification (~2.0kB + classification)
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/firefox';

const api = new NetworkInformation({ 
    classificationTable: CLASSIFICATION // Required parameter
});
```

## API Reference

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

### Configuration

```typescript
interface NetworkInformationConfig {
    classificationTable: ConnectionClassification[]; // Required - no default
    cfOrigin?: string; // Cloudflare origin (default: 'https://speed.cloudflare.com')
    estimatedServerTime?: number; // Server processing time in ms (default: 10)
    estimatedHeaderFraction?: number; // Header size fraction (default: 0.005)
    measurementCount?: number; // Number of measurements (default: 2)
    baseMeasurementSize?: number; // Base measurement size in bytes (default: 100000)
    measurementSizeMultiplier?: number; // Size multiplier (default: 2)
    periodicMeasurement?: boolean; // Enable periodic re-measurement (default: false)
    measurementInterval?: number; // Interval between measurements in ms (default: 30000)
}
```

## Installation Methods Compared

### Automatic Polyfill (Recommended for most users)

```typescript
import '@esroyo/network-information-api-polyfill';
```

**Pros:**
- Zero configuration
- Works immediately on `navigator.connection`
- Uses standard WICG classification
- ~2.5kB total bundle size

**Cons:**
- Always includes WICG classification (can't be tree-shaken)
- Less control over configuration

### Manual Installation (Recommended for bundle optimization)

```typescript
import { installNetworkInformationPolyfill } from '@esroyo/network-information-api-polyfill/pure';
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/firefox';

const connection = installNetworkInformationPolyfill({
    classificationTable: CLASSIFICATION, // Required
    measurementCount: 3,
    periodicMeasurement: true
});
```

**Pros:**
- Full control over configuration
- Tree-shakeable classifications
- Smaller bundle when using custom classification
- Can choose specific classification standard

**Cons:**
- Must explicitly specify classification
- Slightly more verbose setup

### Direct Class Usage (Maximum flexibility)

```typescript
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/chrome';

const networkApi = new NetworkInformation({
    classificationTable: CLASSIFICATION, // Required
    periodicMeasurement: true
});

// Manual event handling
networkApi.addEventListener('change', (event) => {
    console.log('Network changed:', event.detail);
});
```

**Pros:**
- Multiple instances with different configurations
- Full event control
- No `navigator` modification
- Smallest possible bundle size

**Cons:**
- Manual instance management
- Must call `dispose()` to prevent memory leaks

## Classification Standards

### WICG (Auto-install default) - 0.5kB
Based on the official [WICG Network Information API specification](https://wicg.github.io/netinfo/):

| Type      | Max Downlink | Min RTT   | Description                                   |
| --------- | ------------ | --------- | --------------------------------------------- |
| `slow-2g` | < 50 kbps    | > 1400ms  | Very slow connection, text-only               |
| `2g`      | < 70 kbps    | > 270ms   | Slow connection, small images                 |
| `3g`      | < 700 kbps   | -         | Moderate connection, high-res images, audio   |
| `4g`      | -            | -         | Fast connection, HD video, real-time features |

### Firefox DevTools - 0.5kB
```typescript
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/firefox';
```

Based on [Firefox DevTools throttling](https://github.com/mozilla-firefox/firefox/blob/main/devtools/docs/user/network_monitor/throttling/index.rst):

| Type      | Max Downlink | Min RTT   | Description                     |
| --------- | ------------ | --------- | ------------------------------- |
| `slow-2g` | < 50 kbps    | > 2000ms  | GPRS (50 kbps, 2000ms RTT)      |
| `2g`      | < 250 kbps   | > 800ms   | Regular 2G (250 kbps, 800ms RTT) |
| `3g`      | < 750 kbps   | > 200ms   | Regular 3G (750 kbps, 200ms RTT) |
| `4g`      | -            | -         | Good 3G+ (1.5+ Mbps, 40ms RTT)   |

### Chrome DevTools - 0.5kB
```typescript
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/chrome';
```

Based on Chrome DevTools throttling (similar to Lighthouse):

| Type      | Max Downlink | Min RTT   | Description                      |
| --------- | ------------ | --------- | -------------------------------- |
| `slow-2g` | < 50 kbps    | > 2000ms  | Slow 2G (50 kbps, 2000ms RTT)   |
| `2g`      | < 70 kbps    | > 1400ms  | 2G (70 kbps, 1400ms RTT)        |
| `3g`      | < 1.6 Mbps   | > 300ms   | Regular 3G (1.6 Mbps, 300ms RTT) |
| `4g`      | -            | -         | Regular 4G+ (9+ Mbps, 170ms RTT) |

## Bundle Size Optimization Strategy

### Why Classification is Required for Manual Usage

The library is designed for optimal bundle size through tree-shaking:

```typescript
// ❌ If we provided defaults, this would always bundle WICG classification
const api = new NetworkInformation(); // Hidden ~0.5kB overhead

// ✅ Explicit choice = only bundle what you use
import { CLASSIFICATION } from './classifications/firefox'; // Exactly 0.5kB
const api = new NetworkInformation({ classificationTable: CLASSIFICATION });
```

### Bundle Size Comparison

| Configuration | Bundle Size | What's Included |
|---------------|-------------|-----------------|
| Auto-install | ~2.5kB | Core + WICG classification |
| Manual + Firefox | ~2.5kB | Core + Firefox classification only |
| Manual + Chrome | ~2.5kB | Core + Chrome classification only |
| Manual + Custom | ~2.0kB | Core + your custom rules |
| Multiple classifications | +0.5kB each | Only if you import multiple |

### Tree-shaking Best Practices

```typescript
// ✅ Optimal - Only bundles Firefox classification
import { NetworkInformation } from '@esroyo/network-information-api-polyfill/pure';
import { CLASSIFICATION } from '@esroyo/network-information-api-polyfill/classifications/firefox';

const api = new NetworkInformation({
    classificationTable: CLASSIFICATION
});

// ❌ Avoid - Bundles all classifications even if unused
import * as Classifications from '@esroyo/network-information-api-polyfill/classifications';
```

## Performance Considerations

- **Measurement Overhead**: Use `measurementCount: 1` for minimal bandwidth usage
- **Memory Usage**: Call `dispose()` when done to clean up timers and listeners
- **Periodic Updates**: Balance accuracy vs. resource usage with appropriate intervals
- **Classification Complexity**: Custom tables with many rules have minimal impact (~0.1kB per rule)

### Choosing the Right Installation Method

| Use Case | Recommended Method | Bundle Impact | Reason |
|----------|-------------------|---------------|---------|
| Quick prototyping | Auto-install | 2.5kB | Zero config, works immediately |
| Production apps | Manual install | 2.0-2.5kB | Control over classification choice |
| Firefox extensions | Manual + Firefox | 2.5kB | Matches Firefox DevTools behavior |
| Chrome extensions | Manual + Chrome | 2.5kB | Matches Chrome DevTools behavior |
| Gaming apps | Manual + Custom | 2.0kB | Gaming-specific latency thresholds |
| Multiple instances | Direct class usage | 2.0-2.5kB | Maximum flexibility |

## Browser Compatibility

- ✅ Modern browsers with fetch API support
- ⚠️ Requires HTTPS for accurate measurements
- 🔧 Works in Node.js with appropriate fetch polyfill
- 📱 Mobile browsers supported

## Contributing

We welcome contributions, especially:

- **New Classification Standards**: Add support for other throttling standards
- **Bundle Size Optimizations**: Further reduce footprint
- **Performance Improvements**: Enhance measurement accuracy
- **Documentation**: Improve examples and use cases

## License

MIT License - see [LICENSE](LICENSE) file for details.
