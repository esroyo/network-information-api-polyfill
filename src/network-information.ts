import type {
    ConnectionClassification,
    ConnectionInfo,
    EffectiveConnectionType,
    NetworkChangeEventDetail,
    NetworkInformationConfig,
    NetworkInformationLike,
    NetworkInformationServices,
    NetworkMeasurement,
    NetworkType,
    PerformanceResourceTiming,
} from './types.ts';

/**
 * Classify connection type based on speed and latency using the configured table
 * @param classificationTable The classification table
 * @param downlinkMbps Downlink speed in Mbps
 * @param rttMs Round-trip time in milliseconds
 * @returns Effective connection type
 */
export const _classifyConnection = (
    classificationTable: ConnectionClassification[],
    downlinkMbps: number,
    rttMs: number,
): EffectiveConnectionType => {
    if (
        !isFinite(downlinkMbps) || downlinkMbps <= 0 || !isFinite(rttMs) ||
        rttMs < 0
    ) {
        return classificationTable[0].type;
    }

    for (const classification of classificationTable) {
        const exceedsDownlinkLimit = classification.maxDownlink !== undefined &&
            downlinkMbps < classification.maxDownlink;
        const exceedsRttLimit = classification.minRtt !== undefined &&
            rttMs > classification.minRtt;

        if (exceedsDownlinkLimit || exceedsRttLimit) {
            return classification.type;
        }
    }

    return classificationTable[classificationTable.length - 1].type;
};

/**
 * Calculate median value from array of numbers
 * @param arr Array of numbers
 * @returns Median value
 */
export const _median = (arr: number[]): number => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
};

export const _pseudoRandomHash = (length: number = 7): string => {
    let str = '';
    while (str.length < length) {
        str += (Math.random() + 1).toString(36).substring(2);
    }
    return str.substring(0, length);
};

/**
 * Network Information Api implementation providing real-time network measurement
 * with configurable classification tables
 *
 * @param options Configuration options for the network measurement
 * @param services Injectable services for testing
 *
 * @example
 * ```typescript
 * // Use default WICG classification
 * import { CLASSIFICATION } from './classifications/wicg.ts';
 * const networkApi = createNetworkInformation({
 *   measurementCount: 3,
 *   periodicMeasurement: true
 *   classificationTable: CLASSIFICATION,
 * });
 *
 * networkApi.addEventListener('change', (event) => {
 *   console.log('Connection type:', event.detail.effectiveType);
 * });
 * ```
 */
export function createNetworkInformation(
    options: NetworkInformationConfig & { autostart?: boolean },
    services: NetworkInformationServices = {},
): NetworkInformationLike {
    // Configuration
    const origin = options.origin ?? 'https://speed.cloudflare.com';
    const estimatedServerTime = options.estimatedServerTime ?? 10;
    const estimatedHeaderFraction = options.estimatedHeaderFraction ?? 0.005;
    const measurementCount = options.measurementCount ?? 2;
    const baseMeasurementSize = options.baseMeasurementSize ?? 100_000;
    const measurementSizeMultiplier = options.measurementSizeMultiplier ?? 2;
    const measurementInterval = options.measurementInterval ?? 30_000;
    const periodicMeasurement = options.periodicMeasurement ?? false;
    const periodicInterval = Math.min(10_000, measurementInterval);
    const classificationTable = options.classificationTable;
    const autostart = options.autostart ?? true;
    const fetch = services.fetch ?? globalThis.fetch.bind(null);

    // State
    let downlink: number | undefined;
    let uplink: number | undefined;
    let rtt: number | undefined;
    let effectiveType: EffectiveConnectionType | undefined;
    let saveData: boolean = false;
    let type: NetworkType = 'unknown';

    let measuring: boolean = false;
    let lastMeasurement: number = 0;
    let periodicTimer: number | undefined;
    let delayTimers: ReturnType<typeof setTimeout>[] = [];

    // Event handling
    const eventTarget = new EventTarget();

    // Private functions

    const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                delayTimers = delayTimers.filter((t) => t !== timer);
                resolve();
            }, ms);
            delayTimers.push(timer);
        });
    };

    /**
     * Dispatch a network change event
     * @param type Event type
     * @param data Event data
     */
    const dispatchNetworkEvent = (
        eventType: string,
        data: NetworkChangeEventDetail = {},
    ): void => {
        eventTarget.dispatchEvent(new CustomEvent(eventType, { detail: data }));
    };

    /**
     * Check if measurement can be performed
     */
    const canPerformMeasurement = (): boolean => {
        return !measuring &&
            Date.now() - lastMeasurement > measurementInterval;
    };

    /**
     * Create measurement URL for given parameters
     */
    const createMeasurementUrl = (
        uid: string,
        bytes: number,
        index: number,
    ): string => {
        return `${origin}/__down?measId=${uid}&bytes=${bytes}&i=${index}`;
    };

    /**
     * Extract server processing time from response headers
     * @param res Fetch response object
     * @returns Server time in milliseconds or null
     */
    const getServerTimeFromResponse = (res: Response): number | null => {
        const serverTiming = res.headers.get('server-timing');
        if (serverTiming) {
            const match = serverTiming.match(/.*dur=([0-9.]+)/);
            if (match) return +match[1];
        }
        return null;
    };

    /**
     * Build timing information from fetch response
     * @param res Fetch response object
     * @returns Timing data or null if unavailable
     */
    const buildTiming = (
        res: Response,
        startTime?: number,
        endTime?: number,
    ): {
        ping: number;
        bps: number;
        duration: number;
        perf?: PerformanceResourceTiming;
    } | null => {
        const perf = performance.getEntriesByType('resource')
            .find((p) => p.name === res.url) as PerformanceResourceTiming;

        let url: URL;
        let numBytes: number;
        try {
            url = new URL(res.url);
            numBytes = parseInt(url.searchParams.get('bytes') || '0', 10);
        } catch {
            numBytes = 0;
        }
        const serverTime = getServerTimeFromResponse(res) ||
            estimatedServerTime;

        let ping: number;
        let networkDuration: number;
        let transferSize: number;

        if (perf) {
            const ttfb = perf.responseStart - perf.requestStart;
            const payloadDownloadTime = perf.responseEnd - perf.responseStart;

            ping = Math.max(0.01, ttfb - serverTime);
            networkDuration = ping + payloadDownloadTime;
            transferSize = perf.transferSize ||
                (numBytes * (1 + estimatedHeaderFraction));
        } else if (startTime !== undefined && endTime !== undefined) {
            const totalDuration = endTime - startTime;
            networkDuration = Math.max(1, totalDuration - serverTime);

            ping = numBytes === 0
                ? Math.max(1, networkDuration * 0.9)
                : Math.min(networkDuration * 0.3, 200);

            transferSize = numBytes * (1 + estimatedHeaderFraction);
        } else {
            return null;
        }

        const bits = 8 * transferSize;
        const downloadTime = numBytes === 0
            ? 0
            : Math.max(1, networkDuration - ping);
        const bps = numBytes === 0 ? 0 : bits / (downloadTime / 1_000);

        return {
            ping,
            bps,
            duration: networkDuration,
            perf: perf || undefined,
        };
    };

    /**
     * Perform latency measurement
     */
    const measureLatency = async (
        uid: string,
        index: number,
    ): Promise<{ ping: number } | null> => {
        const startTime = performance.now();
        const response = await fetch(
            createMeasurementUrl(uid, 0, index),
        );
        await response.text();
        const endTime = performance.now();

        const timing = buildTiming(response, startTime, endTime);
        return timing ? { ping: timing.ping } : null;
    };

    /**
     * Perform download measurement
     */
    const measureDownload = async (
        uid: string,
        measurementSize: number,
        index: number,
    ): Promise<{ mbps: number; networkTime: number; totalTime: number } | null> => {
        const startTime = performance.now();
        const response = await fetch(
            createMeasurementUrl(uid, measurementSize, index),
        );
        await response.text();
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        const serverTime = getServerTimeFromResponse(response) ||
            estimatedServerTime;
        const networkTime = Math.max(1, totalTime - serverTime);
        const bits = 8 * (measurementSize * (1 + estimatedHeaderFraction));
        const bps = bits / (networkTime / 1_000);
        const mbps = bps / 1_000_000;

        return { mbps, networkTime, totalTime };
    };

    /**
     * Perform a single measurement
     * @returns A network measurement
     */
    const performSingleMeasurement = async (
        uid: string,
        measurementSize: number,
        index: number,
    ): Promise<NetworkMeasurement | null> => {
        try {
            const latencyResult = await measureLatency(
                uid,
                index,
            );
            if (!latencyResult) return null;

            await delay(50);

            const downloadResult = await measureDownload(
                uid,
                measurementSize,
                index,
            );
            if (!downloadResult) return null;

            const measurement = {
                rtt: latencyResult.ping,
                downlink: downloadResult.mbps,
                measurementSize,
                duration: downloadResult.networkTime,
                realDuration: downloadResult.totalTime,
                timestamp: Date.now(),
            };
            dispatchNetworkEvent('measurement', measurement);
            return measurement;
        } catch {
            return null;
        }
    };

    /**
     * Measure network speed using multiple test sizes
     */
    const measureNetworkSpeed = async (): Promise<NetworkMeasurement[]> => {
        const uid = _pseudoRandomHash(5);
        const measurements: NetworkMeasurement[] = [];

        for (let i = 0; i < measurementCount; i++) {
            const measurementSize = baseMeasurementSize *
                Math.pow(measurementSizeMultiplier, i);

            const measurement = await performSingleMeasurement(
                uid,
                measurementSize,
                i,
            );

            if (measurement) {
                measurements.push(measurement);
                if (i === 0 && measurementCount > 1) {
                    updateNetworkProperties(
                        measurement.downlink,
                        measurement.rtt,
                        true,
                    );
                }
            }

            if (i < measurementCount - 1) {
                await delay(200);
            }
        }

        return measurements;
    };

    /**
     * Update network properties with common logic
     */
    const updateNetworkProperties = (
        newDownlink: number,
        newRtt: number,
        isPreliminary: boolean = false,
    ): void => {
        const prevEffectiveType = effectiveType;

        downlink = newDownlink;
        rtt = newRtt;
        uplink = newDownlink * 0.5;
        effectiveType = _classifyConnection(
            classificationTable,
            newDownlink,
            newRtt,
        );

        if (prevEffectiveType !== effectiveType || !isPreliminary) {
            dispatchNetworkEvent('change', {
                downlink,
                uplink,
                rtt,
                effectiveType,
                preliminary: isPreliminary,
            });
        }
    };

    /**
     * Update network properties from all measurements using median values
     * @param measurements Array of measurement results
     */
    const updateFromMeasurements = (
        measurements: NetworkMeasurement[],
    ): void => {
        if (measurements.length === 0) return;

        const rtts = measurements.map((m) => m.rtt).sort((a, b) => a - b);
        const downlinks = measurements.map((m) => m.downlink).sort((a, b) =>
            a - b
        );

        updateNetworkProperties(
            _median(downlinks),
            _median(rtts),
            false,
        );
    };

    /**
     * Perform a network measurement cycle
     */
    const performMeasurement = async (): Promise<void> => {
        if (measuring) return;

        measuring = true;
        lastMeasurement = Date.now();

        try {
            const measurements = await measureNetworkSpeed();
            updateFromMeasurements(measurements);
        } catch {
            // Silent failure
        } finally {
            measuring = false;
        }
    };

    /**
     * Start periodic network measurements
     */
    const startPeriodicMeasurements = (): void => {
        periodicTimer = setInterval(() => {
            if (canPerformMeasurement()) {
                performMeasurement();
            }
        }, periodicInterval);
    };

    /**
     * Initialize the network measurement system
     */
    const init = async (): Promise<void> => {
        await performMeasurement();

        if (periodicMeasurement) {
            startPeriodicMeasurements();
        }
    };

    // Initialize
    if (autostart) {
        init();
    }

    // Return the public interface
    return {
        // Getters

        // W3C Network Information Api properties
        /** Downlink speed in Mbps */
        get downlink(): number | undefined {
            return downlink;
        },
        /** Uplink speed in Mbps */
        get uplink(): number | undefined {
            return uplink;
        },
        /** Round-trip time in milliseconds */
        get rtt(): number | undefined {
            return rtt;
        },
        /** Effective connection type classification */
        get effectiveType(): EffectiveConnectionType | undefined {
            return effectiveType;
        },
        /** Whether data saving mode is enabled */
        get saveData(): boolean {
            return saveData;
        },
        /** Connection type */
        get type(): NetworkType {
            return type;
        },

        // Methods

        /**
         * Manually trigger a network measurement
         * @returns Promise that resolves when measurement is complete
         */
        measure: performMeasurement,

        /**
         * Get current connection information
         * @returns Object containing current network measurements
         */
        getConnectionInfo(): ConnectionInfo {
            return {
                downlink,
                uplink,
                rtt,
                effectiveType,
                saveData,
                type,
            };
        },

        /**
         * Dispose of the NetworkInformation instance and cleanup resources
         * Call this when you no longer need the instance to prevent memory leaks
         */
        dispose(): void {
            // Clear the periodic measurement timer
            if (periodicTimer !== undefined) {
                clearInterval(periodicTimer);
                periodicTimer = undefined;
            }
            // Clear any pending delays
            for (const timer of delayTimers) {
                clearTimeout(timer);
            }
            delayTimers = [];
            // Cancel any ongoing measurements (best effort)
            measuring = false;
        },

        addEventListener(
            type: string,
            listener: (event: CustomEvent<NetworkChangeEventDetail>) => void,
            options?: boolean | AddEventListenerOptions,
        ): void {
            eventTarget.addEventListener(
                type,
                listener as EventListener,
                options,
            );
        },

        removeEventListener(
            type: string,
            listener: (event: CustomEvent<NetworkChangeEventDetail>) => void,
            options?: EventListenerOptions | boolean,
        ): void {
            eventTarget.removeEventListener(
                type,
                listener as EventListener,
                options,
            );
        },
    };
}
