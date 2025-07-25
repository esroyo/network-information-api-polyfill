/**
 * Network Information Api Polyfill (Auto-install)
 * Automatically installs polyfill when imported
 * Based on Firefox DevTools throttling classifications and W3C Network Information Api spec
 *
 * @example
 * ```typescript
 * // Just import to auto-install
 * import './network-information-polyfill.js';
 *
 * // Now available on navigator
 * console.log(navigator.connection?.effectiveType);
 * ```
 */

import type { NetworkInformationConfig } from './types.ts';
import { NetworkInformationApi } from './network-information.ts';

// Extend Navigator interface to include connection property
declare global {
    interface Navigator {
        /** Network Information Api connection object */
        connection?: NetworkInformationApi;
    }
}

/**
 * Install the Network Information Api polyfill
 *
 * Checks if native implementation exists and only installs polyfill if needed.
 * The polyfill will be available as `navigator.connection`.
 *
 * @param options Configuration options for the polyfill
 * @returns The polyfill instance or native connection object
 *
 * @example
 * ```typescript
 * const connection = installNetworkInformationPolyfill({
 *   measurementCount: 3,
 *   periodicMeasurement: true
 * });
 *
 * connection.addEventListener('change', (event) => {
 *   console.log('Network changed:', event.detail.effectiveType);
 * });
 * ```
 */
export function installNetworkInformationPolyfill(
    options: NetworkInformationConfig = {},
): NetworkInformationApi {
    const polyfill = new NetworkInformationApi(options);

    Object.defineProperty(navigator, 'connection', {
        value: polyfill,
        writable: false,
        enumerable: true,
        configurable: false,
    });

    return polyfill;
}
