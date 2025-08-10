import { assertEquals, assertExists, assertInstanceOf } from '@std/assert';
import { assertSpyCalls, returnsNext, spy, stub } from '@std/testing/mock';
import { FakeTime } from '@std/testing/time';

import {
    _classifyConnection,
    _median,
    _pseudoRandomHash,
    createNetworkInformation,
} from './network-information.ts';
import CLASSIFICATION_WICG from './classifications/wicg.ts';
import CLASSIFICATION_FIREFOX from './classifications/firefox.ts';
import CLASSIFICATION_CHROME from './classifications/chrome.ts';
import type { ConnectionClassification } from './types.ts';

const createFetchMock = (
    responses: Array<Promise<Response> | Response | Error>,
) => {
    const nextReply = returnsNext(responses);
    const fetchMock = spy(async (
        _input: RequestInfo | URL,
        _init?: RequestInit,
    ): Promise<Response> => {
        const delayedResponse = Promise.withResolvers<Response>();
        if (_init?.signal) {
            _init.signal.addEventListener('abort', (ev) => {
                if ('reason' in ev.target!) {
                    delayedResponse.reject(ev.target.reason);
                }
            });
        }
        Promise.resolve(nextReply()).then((value) =>
            delayedResponse.resolve(value)
        );
        return delayedResponse.promise;
    });
    return fetchMock;
};

// Helper to create a test instance that doesn't auto-initialize
const createTestInstance: typeof createNetworkInformation = (
    config,
    services = {},
) => {
    if (config.autostart === undefined) {
        config.autostart = false;
    }
    return createNetworkInformation(config, services);
};

Deno.test('createNetworkInformation - Constructor', () => {
    const api = createTestInstance({
        classificationTable: CLASSIFICATION_WICG,
    });

    assertEquals(api.saveData, false);
    assertEquals(api.type, 'unknown');
    assertEquals(api.downlink, undefined);
    assertEquals(api.uplink, undefined);
    assertEquals(api.rtt, undefined);
    assertEquals(api.effectiveType, undefined);

    api.dispose();
});

// Test Suite - Classification Logic with Different Tables
Deno.test('createNetworkInformation - WICG Classification Logic', () => {
    // WICG thresholds
    assertEquals(
        _classifyConnection(CLASSIFICATION_WICG, 0.04, 100),
        'slow-2g',
    ); // Below 50 kbps
    assertEquals(
        _classifyConnection(CLASSIFICATION_WICG, 0.1, 1500),
        'slow-2g',
    ); // Above 1400ms RTT
    assertEquals(_classifyConnection(CLASSIFICATION_WICG, 0.06, 100), '2g'); // Below 70 kbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_WICG, 0.1, 500), '2g'); // Good bandwidth, high RTT (> 270ms)
    assertEquals(_classifyConnection(CLASSIFICATION_WICG, 0.5, 100), '3g'); // Below 700 kbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_WICG, 0.7, 100), '4g'); // At 700 kbps threshold
    assertEquals(_classifyConnection(CLASSIFICATION_WICG, 2.0, 50), '4g'); // Well above threshold
});

Deno.test('createNetworkInformation - Firefox Classification Logic', () => {
    assertEquals(
        _classifyConnection(CLASSIFICATION_FIREFOX, 0.04, 100),
        'slow-2g',
    ); // Below 50 kbps
    assertEquals(
        _classifyConnection(CLASSIFICATION_FIREFOX, 0.1, 2100),
        'slow-2g',
    ); // Above 2000ms RTT
    assertEquals(_classifyConnection(CLASSIFICATION_FIREFOX, 0.2, 100), '2g'); // Below 250 kbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_FIREFOX, 0.5, 900), '2g'); // Good bandwidth, high RTT (> 800ms)
    assertEquals(_classifyConnection(CLASSIFICATION_FIREFOX, 0.6, 100), '3g'); // Below 750 kbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_FIREFOX, 1.0, 250), '3g'); // Good bandwidth, high RTT (> 200ms)
    assertEquals(_classifyConnection(CLASSIFICATION_FIREFOX, 1.0, 100), '4g'); // Above all thresholds
});

Deno.test('createNetworkInformation - Chrome Classification Logic', () => {
    assertEquals(
        _classifyConnection(CLASSIFICATION_CHROME, 0.04, 100),
        'slow-2g',
    ); // Below 50 kbps
    assertEquals(
        _classifyConnection(CLASSIFICATION_CHROME, 0.1, 2100),
        'slow-2g',
    ); // Above 2000ms RTT
    assertEquals(_classifyConnection(CLASSIFICATION_CHROME, 0.06, 100), '2g'); // Below 70 kbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_CHROME, 0.1, 1500), '2g'); // Good bandwidth, high RTT (> 1400ms)
    assertEquals(_classifyConnection(CLASSIFICATION_CHROME, 1.2, 100), '3g'); // Below 1.6 Mbps, good RTT
    assertEquals(_classifyConnection(CLASSIFICATION_CHROME, 2.0, 350), '3g'); // Good bandwidth, high RTT (> 300ms)
    assertEquals(_classifyConnection(CLASSIFICATION_CHROME, 2.0, 100), '4g'); // Above all thresholds
});

Deno.test('NetworkInformation - Custom classification with measurements', () => {
    const customTable: ConnectionClassification[] = [
        { type: 'slow-2g', maxDownlink: 0.2, minRtt: 800 },
        { type: '2g', maxDownlink: 1.0, minRtt: 400 },
        { type: '3g', maxDownlink: 5.0, minRtt: 150 },
        { type: '4g' },
    ];

    // Classify test values that would be different with WICG classification
    assertEquals(_classifyConnection(customTable, 0.8, 200), '2g');
});

Deno.test('NetworkInformation - Median calculation', () => {
    assertEquals(_median([1, 3, 5]), 3);
    assertEquals(_median([1, 2, 4, 5]), 3);
    assertEquals(_median([42]), 42);
    assertEquals(_median([10, 20]), 15);
});

Deno.test('NetworkInformation - Pseudo random hash', () => {
    const hash1 = _pseudoRandomHash(5);
    const hash2 = _pseudoRandomHash(5);

    assertEquals(hash1.length, 5);
    assertEquals(hash2.length, 5);
    assertEquals(hash1 === hash2, false);
});

Deno.test('createNetworkInformation - Concurrent measurement prevention', async () => {
    // Mock fetch to simulate slow network
    const fetchMock = createFetchMock([
        new Promise((resolve) =>
            setTimeout(() => resolve(new Response('test')), 100)
        ),
        new Response('test2'),
    ]);

    const api = createTestInstance({
        classificationTable: CLASSIFICATION_WICG,
        measurementCount: 1,
    }, { fetch: fetchMock });

    // Start first measurement
    const promise1 = api.measure();

    // Try to start second measurement (should be ignored due to concurrent protection)
    const promise2 = api.measure();

    await Promise.all([promise1, promise2]);

    // Both should resolve without issues
    api.dispose();
});

Deno.test('createNetworkInformation - Periodic measurements', async () => {
    using fakeTime = new FakeTime();

    const fetchMock = createFetchMock([
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
    ]);

    const api = createNetworkInformation({
        classificationTable: CLASSIFICATION_WICG,
        periodicMeasurement: true,
        measurementInterval: 5_000,
        measurementCount: 1,
    }, { fetch: fetchMock });

    // Let initial measurement complete
    await fakeTime.nextAsync();

    await new Promise<void>((resolve) => {
        api.addEventListener('measurement', () => {
            resolve();
        }, { once: true });
    });

    assertSpyCalls(fetchMock, 2);

    // Fast forward time to trigger periodic measurements
    await fakeTime.tickAsync(5_000); // 5s

    // Let the measurement complete
    fakeTime.tick(50);
    await fakeTime.nextAsync();

    // Wait for initial measurement with timeout
    await new Promise<void>((resolve) => {
        api.addEventListener('measurement', () => {
            resolve();
        }, { once: true });
    });

    // Should have made additional measurements
    assertSpyCalls(fetchMock, 4);

    api.dispose();
});

Deno.test('createNetworkInformation - Error handling in measurement', async () => {
    // Mock fetch to throw error
    const fetchMock = createFetchMock([new Error('Network error')]);

    const api = createTestInstance({
        classificationTable: CLASSIFICATION_WICG,
        measurementCount: 1,
    }, { fetch: fetchMock });

    // Should not throw, should handle error silently
    await api.measure();

    // Should complete gracefully
    api.dispose();
});

Deno.test('createNetworkInformation - Dispose cleanup', () => {
    const api = createTestInstance({
        classificationTable: CLASSIFICATION_WICG,
        periodicMeasurement: true,
    });

    // Should not throw
    api.dispose();

    // Calling dispose multiple times should be safe
    api.dispose();
});

Deno.test('createNetworkInformation - Event listener management', async () => {
    const fetchMock = createFetchMock([
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
        new Response('test', { headers: { 'server-timing': 'dur=10' } }),
    ]);
    const api = createNetworkInformation({
        classificationTable: CLASSIFICATION_WICG,
        measurementCount: 1,
    }, { fetch: fetchMock });

    let eventCount = 0;
    const listener = () => {
        eventCount++;
    };

    api.addEventListener('change', listener);
    api.removeEventListener('change', listener);

    // Wait a bit to see if any events fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    api.dispose();
});

// Integration test with real network (optional, requires --allow-net)
Deno.test({
    name: 'createNetworkInformation - Real network integration',
    ignore: false, // Set to false to run real network tests
    permissions: { net: true },
    fn: async () => {
        const api = createNetworkInformation({
            measurementCount: 1,
            baseMeasurementSize: 1000, // Small size for faster test
            classificationTable: CLASSIFICATION_FIREFOX,
        });

        // Wait for initial measurement with timeout
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Measurement timeout'));
            }, 10000); // 10 second timeout

            api.addEventListener('change', () => {
                clearTimeout(timeout);
                resolve(undefined);
            });
        });

        assertExists(api.downlink);
        assertExists(api.uplink);
        assertExists(api.rtt);
        assertExists(api.effectiveType);

        const info = api.getConnectionInfo();
        assertExists(info.downlink);
        assertExists(info.uplink);
        assertExists(info.rtt);
        assertExists(info.effectiveType);

        api.dispose();
    },
});
