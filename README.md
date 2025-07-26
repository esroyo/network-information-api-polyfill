# Network Information API polyfill

[![JSR](https://jsr.io/badges/@esroyo/network-information-api-polyfill)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![JSR Score](https://jsr.io/badges/@esroyo/network-information-api-polyfill/score)](https://jsr.io/@esroyo/network-information-api-polyfill)
[![codecov](https://codecov.io/gh/esroyo/network-information-api-polyfill/graph/badge.svg?token=YO7XY0TDX5)](https://codecov.io/gh/esroyo/network-information-api-polyfill)

A polyfill for the
[W3C Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
that provides real-time network connection information when the native API is
not available.

## Features

- 🚀 **Automatic Installation** - Just import and use
- 📊 **Real-time Measurements** - Active network speed testing using
  Cloudflare's infrastructure
- ⚡ **Lightweight** - Less than **3kB** compressed transfer size
- 🎯 **W3C Compliant** - Follows the official Network Information API
  specification
- 🔄 **Periodic Updates** - Optional continuous monitoring of network conditions
- 🎛️ **Configurable** - Customizable measurement parameters

## Try it right now (🚀 no installation!)

**Test in your browser console in 2 seconds:**

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

### Atomatic polyfilling

```typescript
import '@esroyo/network-information-api-polyfill';
```

### Manual installation

```typescript
import { installNetworkInformationPolyfill } from '@esroyo/network-information-api-polyfill/pure';

// Install with default options
installNetworkInformationPolyfill();

// Or with custom configuration
installNetworkInformationPolyfill({
    measurementCount: 3,
    periodicMeasurement: true,
    measurementInterval: 30000,
});
```

## Usage

### Basic usage (auto-install)

```typescript
// Import to automatically install the polyfill
import '@esroyo/network-information-api-polyfill';

// Now available on navigator
console.log(navigator.connection?.effectiveType); // '4g', '3g', '2g', 'slow-2g'
console.log(navigator.connection?.downlink); // Downlink speed in Mbps
console.log(navigator.connection?.rtt); // Round-trip time in ms
```

### Manual usage

```typescript
import { NetworkInformationApi } from '@esroyo/network-information-api-polyfill/pure';

const networkApi = new NetworkInformationApi({
    measurementCount: 3,
    periodicMeasurement: true,
});

// Listen for network changes
networkApi.addEventListener('change', (event) => {
    console.log('Network changed:', {
        effectiveType: event.detail.effectiveType,
        downlink: event.detail.downlink,
        rtt: event.detail.rtt,
    });
});
```

## API reference

### Properties

- `downlink`: Downlink speed in Mbps
- `uplink`: Uplink speed in Mbps (estimated)
- `rtt`: Round-trip time in milliseconds
- `effectiveType`: Connection classification (`'slow-2g'`, `'2g'`, `'3g'`,
  `'4g'`)
- `saveData`: Whether data saving mode is enabled
- `type`: Connection type (always `'unknown'` in polyfill)

### Events

- `change`: Fired when network conditions change

### Configuration options

```typescript
interface NetworkInformationConfig {
    cfOrigin?: string; // Cloudflare origin URL (default: 'https://speed.cloudflare.com')
    estimatedServerTime?: number; // Server processing time in ms (default: 10)
    estimatedHeaderFraction?: number; // Header size fraction (default: 0.005)
    measurementCount?: number; // Number of measurements (default: 2)
    baseMeasurementSize?: number; // Base measurement size in bytes (default: 100000)
    measurementSizeMultiplier?: number; // Size multiplier for subsequent tests (default: 2)
    periodicMeasurement?: boolean; // Enable periodic re-measurement (default: false)
    measurementInterval?: number; // Interval between measurements in ms (default: 30000)
}
```

## Connection classifications

The polyfill uses Firefox DevTools throttling classifications:

| Type      | Downlink  | Uplink    | RTT   | Description          |
| --------- | --------- | --------- | ----- | -------------------- |
| `slow-2g` | 0.05 Mbps | 0.02 Mbps | 500ms | Very slow connection |
| `2g`      | 0.25 Mbps | 0.05 Mbps | 300ms | Slow connection      |
| `3g`      | 0.75 Mbps | 0.25 Mbps | 100ms | Moderate connection  |
| `4g`      | 4+ Mbps   | 3+ Mbps   | 20ms  | Fast connection      |

## How It works

1. **Detection**: Checks if native `navigator.connection` exists
2. **Measurement**: Performs speed tests using Cloudflare's infrastructure
3. **Classification**: Categorizes connection based on measured speed and
   latency
4. **Monitoring**: Optionally continues measuring at specified intervals
5. **Events**: Dispatches `change` events when network conditions change

## Browser compatibility

- ✅ Modern browsers with fetch API support
- ⚠️ Requires HTTPS for accurate measurements in browsers

## Development

```bash
# Run tests
deno task test

# Watch mode
deno task dev

# Format code
deno task fmt

# Generate coverage report
deno task coverage
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
