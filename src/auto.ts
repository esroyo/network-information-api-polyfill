import { installNetworkInformationPolyfill } from './install.ts';

if (
    typeof window !== 'undefined' && typeof navigator !== 'undefined' &&
    (!('connection' in navigator) || !navigator.connection)
) {
    const { default: CLASSIFICATION } = await import(
        './classifications/wicg.ts'
    );
    installNetworkInformationPolyfill({ classificationTable: CLASSIFICATION });
}
