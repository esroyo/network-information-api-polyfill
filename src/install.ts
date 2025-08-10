/**
 * Network Information Api Polyfill (Auto-install)
 * Automatically installs polyfill when imported
 * Based on Firefox DevTools throttling classifications and W3C Network Information Api spec
 *
 * @example
 * ```typescript
 * // Just import to auto-install
 * import '@esroyo/network-information-api-polyfill';
 *
 * // Now available on navigator with proper typing
 * console.log(navigator.connection?.effectiveType);
 * ```
 *
 * If you need to have a type declaration:
 * ```typescript
 * import type { NetworkInformationLike } from '@esroyo/network-information-api-polyfill';
 *
 * declare global {
 *     interface Navigator {
 *         connection?: NetworkInformationLike;
 *     }
 * }
 * ```
 */
import type {
    NetworkInformationConfig,
    NetworkInformationLike,
} from './types.ts';
import { createNetworkInformation } from './network-information.ts';

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
 * import CLASSIFICATION_FIREFOX from '@esroyo/network-information-api-polyfill/classifications/firefox';
 *
 * const connection = installNetworkInformationPolyfill({
 *   classificationTable: CLASSIFICATION_FIREFOX,
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
    options: NetworkInformationConfig,
): NetworkInformationLike {
    const polyfill = createNetworkInformation(options);

    Object.defineProperty(navigator, 'connection', {
        value: polyfill,
        writable: false,
        enumerable: true,
        configurable: false,
    });

    return polyfill;
}
