import { installNetworkInformationPolyfill } from './install.ts';

if (
    typeof window !== 'undefined' && typeof navigator !== 'undefined' &&
    (!('connection' in navigator) || !navigator.connection)
) {
    installNetworkInformationPolyfill();
}
