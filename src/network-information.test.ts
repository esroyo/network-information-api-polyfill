import { assertEquals, assertExists, assertInstanceOf, assertThrows } from '@std/assert';
import { assertSpyCalls, returnsNext, spy, stub } from '@std/testing/mock';
import { FakeTime } from '@std/testing/time';

import { NetworkInformation as RealNetworkInformation } from './network-information.ts';
import { CLASSIFICATION as CLASSIFICATION_WICG } from './classifications/wicg.ts';
import { CLASSIFICATION as CLASSIFICATION_FIREFOX } from './classifications/firefox.ts';
import { CLASSIFICATION as CLASSIFICATION_CHROME } from './classifications/chrome.ts';
import type { ConnectionClassification } from './types.ts';

class NetworkInformation extends RealNetworkInformation {
    /** Avoid init on tests */
    protected override async _init(): Promise<void> {}
}

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

Deno.test('NetworkInformation - Constructor with a classification', () => {
    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG });

    assertInstanceOf(api, EventTarget);
    assertEquals(api.saveData, false);
    assertEquals(api.type, 'unknown');
    assertEquals(api.downlink, undefined);
    assertEquals(api.uplink, undefined);
    assertEquals(api.rtt, undefined);
    assertEquals(api.effectiveType, undefined);

    assertEquals((api as any)._classificationTable.length, 4);
    assertEquals((api as any)._classificationTable[0].type, 'slow-2g');
    assertEquals((api as any)._classificationTable[3].type, '4g');

    api.dispose();
});

Deno.test('NetworkInformation - Constructor with custom classification', () => {
    const customTable: ConnectionClassification[] = [
        { type: 'slow-2g', maxDownlink: 0.1, minRtt: 1000 },
        { type: '2g', maxDownlink: 0.5, minRtt: 500 },
        { type: '3g', maxDownlink: 2.0, minRtt: 200 },
        { type: '4g' }
    ];

    const api = new NetworkInformation({
        classificationTable: customTable,
        cfOrigin: 'https://custom.test.com',
        measurementCount: 5,
        baseMeasurementSize: 50000,
        periodicMeasurement: true,
    });

    assertEquals((api as any)._classificationTable.length, 4);
    assertEquals((api as any)._classificationTable[0].maxDownlink, 0.1);
    assertEquals((api as any)._classificationTable[0].minRtt, 1000);
    assertEquals((api as any)._cfOrigin, 'https://custom.test.com');
    assertEquals((api as any)._measurementCount, 5);
    assertEquals((api as any)._baseMeasurementSize, 50000);
    assertEquals((api as any)._periodicMeasurement, true);

    api.dispose();
});

// Test Suite - Classification Logic with Different Tables
Deno.test('NetworkInformation - WICG Classification Logic', () => {
    const api = new NetworkInformation({
        classificationTable: CLASSIFICATION_WICG
    });

    // WICG thresholds
    assertEquals((api as any)._classifyConnection(0.04, 100), 'slow-2g'); // Below 50 kbps
    assertEquals((api as any)._classifyConnection(0.1, 1500), 'slow-2g'); // Above 1400ms RTT
    assertEquals((api as any)._classifyConnection(0.06, 100), '2g'); // Below 70 kbps, good RTT
    assertEquals((api as any)._classifyConnection(0.1, 500), '2g'); // Good bandwidth, high RTT (> 270ms)
    assertEquals((api as any)._classifyConnection(0.5, 100), '3g'); // Below 700 kbps, good RTT
    assertEquals((api as any)._classifyConnection(0.7, 100), '4g'); // At 700 kbps threshold
    assertEquals((api as any)._classifyConnection(2.0, 50), '4g'); // Well above threshold

    api.dispose();
});

Deno.test('NetworkInformation - Firefox Classification Logic', () => {
    const api = new NetworkInformation({
        classificationTable: CLASSIFICATION_FIREFOX
    });

    // Firefox thresholds
    assertEquals((api as any)._classifyConnection(0.04, 100), 'slow-2g'); // Below 50 kbps
    assertEquals((api as any)._classifyConnection(0.1, 2100), 'slow-2g'); // Above 2000ms RTT
    assertEquals((api as any)._classifyConnection(0.2, 100), '2g'); // Below 250 kbps, good RTT
    assertEquals((api as any)._classifyConnection(0.5, 900), '2g'); // Good bandwidth, high RTT (> 800ms)
    assertEquals((api as any)._classifyConnection(0.6, 100), '3g'); // Below 750 kbps, good RTT
    assertEquals((api as any)._classifyConnection(1.0, 250), '3g'); // Good bandwidth, high RTT (> 200ms)
    assertEquals((api as any)._classifyConnection(1.0, 100), '4g'); // Above all thresholds

    api.dispose();
});

Deno.test('NetworkInformation - Chrome Classification Logic', () => {
    const api = new NetworkInformation({
        classificationTable: CLASSIFICATION_CHROME
    });

    // Chrome thresholds
    assertEquals((api as any)._classifyConnection(0.04, 100), 'slow-2g'); // Below 50 kbps
    assertEquals((api as any)._classifyConnection(0.1, 2100), 'slow-2g'); // Above 2000ms RTT
    assertEquals((api as any)._classifyConnection(0.06, 100), '2g'); // Below 70 kbps, good RTT
    assertEquals((api as any)._classifyConnection(0.1, 1500), '2g'); // Good bandwidth, high RTT (> 1400ms)
    assertEquals((api as any)._classifyConnection(1.2, 100), '3g'); // Below 1.6 Mbps, good RTT
    assertEquals((api as any)._classifyConnection(2.0, 350), '3g'); // Good bandwidth, high RTT (> 300ms)
    assertEquals((api as any)._classifyConnection(2.0, 100), '4g'); // Above all thresholds

    api.dispose();
});

// Test Suite - Custom Classification Edge Cases
Deno.test('NetworkInformation - Custom classification edge cases', () => {
    const customTable: ConnectionClassification[] = [
        { type: 'slow-2g', maxDownlink: 0.1, minRtt: 1000 },
        { type: '2g', maxDownlink: 0.5, minRtt: 500 },
        { type: '3g', maxDownlink: 2.0, minRtt: 100 },
        { type: '4g' }
    ];

    const api = new NetworkInformation({
        classificationTable: customTable
    });

    // Test edge cases
    assertEquals((api as any)._classifyConnection(0, 100), 'slow-2g'); // Zero bandwidth
    assertEquals((api as any)._classifyConnection(-1, 100), 'slow-2g'); // Negative bandwidth
    assertEquals((api as any)._classifyConnection(Infinity, 100), 'slow-2g'); // Infinite bandwidth
    assertEquals((api as any)._classifyConnection(NaN, 100), 'slow-2g'); // NaN bandwidth
    assertEquals((api as any)._classifyConnection(1.0, -1), 'slow-2g'); // Negative RTT
    assertEquals((api as any)._classifyConnection(1.0, Infinity), 'slow-2g'); // Infinite RTT

    // Test OR logic - should classify as slowest category where either condition is met
    assertEquals((api as any)._classifyConnection(0.05, 50), 'slow-2g'); // Low bandwidth, good RTT
    assertEquals((api as any)._classifyConnection(1.0, 1200), 'slow-2g'); // Good bandwidth, high RTT
    assertEquals((api as any)._classifyConnection(0.3, 300), '2g'); // Medium bandwidth, medium RTT
    assertEquals((api as any)._classifyConnection(5.0, 50), '4g'); // High bandwidth, low RTT

    api.dispose();
});

Deno.test('NetworkInformation - Custom classification with measurements', () => {
    const customTable: ConnectionClassification[] = [
        { type: 'slow-2g', maxDownlink: 0.2, minRtt: 800 },
        { type: '2g', maxDownlink: 1.0, minRtt: 400 },
        { type: '3g', maxDownlink: 5.0, minRtt: 150 },
        { type: '4g' }
    ];

    const api = new NetworkInformation({
        classificationTable: customTable
    });

    // Set test values that would be different with WICG classification
    (api as any)._updateNetworkProperties(0.8, 200, false);

    assertEquals(api.effectiveType, '2g'); // Uses custom table
    assertEquals(api.downlink, 0.8);
    assertEquals(api.rtt, 200);

    api.dispose();
});

Deno.test('NetworkInformation - Event dispatching with custom classification', async () => {
    const api = new NetworkInformation({
        classificationTable: CLASSIFICATION_FIREFOX
    });

    let eventFired = false;
    let eventDetail: any = null;

    api.addEventListener('change', (event) => {
        eventFired = true;
        eventDetail = (event as CustomEvent).detail;
    });

    const testData = {
        downlink: 0.3,
        uplink: 0.15,
        rtt: 100,
        effectiveType: '2g',
        preliminary: false,
    };

    (api as any)._dispatchNetworkEvent('change', testData);

    // Allow event to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(eventFired, true);
    assertEquals(eventDetail.effectiveType, '2g');
    assertEquals(eventDetail.downlink, 0.3);

    api.dispose();
});

Deno.test('NetworkInformation - Median calculation', () => {
    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG });

    assertEquals((api as any)._median([1, 3, 5]), 3);
    assertEquals((api as any)._median([1, 2, 4, 5]), 3);
    assertEquals((api as any)._median([42]), 42);
    assertEquals((api as any)._median([10, 20]), 15);

    api.dispose();
});

Deno.test('NetworkInformation - Pseudo random hash', () => {
    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG });

    const hash1 = (api as any)._pseudoRandomHash(5);
    const hash2 = (api as any)._pseudoRandomHash(5);

    assertEquals(hash1.length, 5);
    assertEquals(hash2.length, 5);
    assertEquals(hash1 === hash2, false);

    api.dispose();
});

Deno.test('NetworkInformation - Measurement state management', async () => {
    // Mock fetch to avoid real network calls
    const fetch = createFetchMock([
        new Response('test', {
            headers: { 'server-timing': 'dur=10' },
        }),
    ]);

    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG }, { fetch });

    assertEquals((api as any)._measuring, false);

    // Start measurement
    const measurePromise = api.measure();
    assertEquals((api as any)._measuring, true);

    await measurePromise;
    assertEquals((api as any)._measuring, false);

    api.dispose();
});

Deno.test('NetworkInformation - Concurrent measurement prevention', async () => {
    // Mock fetch to simulate slow network
    const fetch = createFetchMock([
        new Promise((resolve) =>
            setTimeout(() => resolve(new Response('test')), 100)
        ),
    ]);

    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG }, { fetch });

    // Start first measurement
    const promise1 = api.measure();
    assertEquals((api as any)._measuring, true);

    // Try to start second measurement (should be ignored)
    const promise2 = api.measure();

    await Promise.all([promise1, promise2]);

    // Both should resolve, but second should return immediately
    assertEquals((api as any)._measuring, false);

    api.dispose();
});

Deno.test('NetworkInformation - Periodic measurements', async () => {
    const time = new FakeTime();

    const api = new NetworkInformation({
        classificationTable: CLASSIFICATION_WICG,
        periodicMeasurement: true,
        measurementInterval: 5000,
    });

    // Mock the measurement method
    const measureSpy = stub(api, '_performMeasurement' as any);

    // Start periodic measurements
    (api as any)._startPeriodicMeasurements();

    // Fast forward time
    time.tick(15000); // 15 seconds

    // Should have called measurement at least once during periodic checks
    assertSpyCalls(measureSpy, 1); // Initial call doesn't happen due to mocked _init

    measureSpy.restore();
    time.restore();
    api.dispose();
});

Deno.test('NetworkInformation - Error handling in measurement', async () => {
    // Mock fetch to throw error
    const fetch = createFetchMock([new Error('Network error')]);

    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG }, { fetch });

    // Should not throw, should handle error silently
    await api.measure();

    // Measurement should be reset to false even after error
    assertEquals((api as any)._measuring, false);

    api.dispose();
});

Deno.test('NetworkInformation - Update from measurements with empty array', () => {
    const api = new NetworkInformation({ classificationTable: CLASSIFICATION_WICG });

    // Should handle empty measurements array gracefully
    (api as any)._updateFromMeasurements([]);

    // Values should remain undefined
    assertEquals(api.downlink, undefined);
    assertEquals(api.uplink, undefined);
    assertEquals(api.rtt, undefined);
    assertEquals(api.effectiveType, undefined);

    api.dispose();
});

// Integration test with real network (optional, requires --allow-net)
Deno.test({
    name: 'NetworkInformation - Real network with Firefox classification',
    ignore: false, // Set to false to run real network tests
    permissions: { net: true },
    fn: async () => {
        const api = new RealNetworkInformation({
            measurementCount: 1,
            baseMeasurementSize: 1000, // Small size for faster test
            classificationTable: CLASSIFICATION_FIREFOX
        });

        // Wait for initial measurement
        await new Promise((resolve) => {
            api.addEventListener('change', resolve);
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
