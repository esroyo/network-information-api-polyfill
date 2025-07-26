import type {
    ConnectionInfo,
    EffectiveConnectionType,
    NetworkChangeEventDetail,
    NetworkInformationConfig,
    NetworkMeasurement,
    NetworkType,
    PerformanceResourceTiming,
} from './types.ts';

/**
 * Network Information Api implementation providing real-time network measurement
 *
 * Based on Firefox DevTools throttling classifications and W3C Network Information Api spec
 *
 * @example
 * ```typescript
 * const networkApi = new NetworkInformationApi({
 *   measurementCount: 3,
 *   periodicMeasurement: true
 * });
 *
 * networkApi.addEventListener('change', (event) => {
 *   console.log('Connection type:', event.detail.effectiveType);
 * });
 * ```
 */
export class NetworkInformationApi extends EventTarget {
    protected readonly _cfOrigin: string;
    protected readonly _estimatedServerTime: number;
    protected readonly _estimatedHeaderFraction: number;
    protected readonly _measurementCount: number;
    protected readonly _baseMeasurementSize: number;
    protected readonly _measurementSizeMultiplier: number;
    protected readonly _periodicMeasurement: boolean;
    protected readonly _measurementInterval: number;

    /** Network type classifications based on Firefox DevTools */
    protected readonly _networkTypes: Record<
        EffectiveConnectionType,
        NetworkType
    > = {
        'slow-2g': {
            downlink: 0.05,
            uplink: 0.02,
            rtt: 500,
            effectiveType: 'slow-2g',
        },
        '2g': { downlink: 0.25, uplink: 0.05, rtt: 300, effectiveType: '2g' },
        '3g': { downlink: 0.75, uplink: 0.25, rtt: 100, effectiveType: '3g' },
        '4g': { downlink: 4, uplink: 3, rtt: 20, effectiveType: '4g' },
    };

    protected _downlink?: number;
    protected _uplink?: number;
    protected _rtt?: number;
    protected _effectiveType?: EffectiveConnectionType;
    protected _saveData: boolean = false;
    protected _type: string = 'unknown';

    protected _measuring: boolean = false;
    protected _lastMeasurement: number = 0;

    /**
     * Create a new NetworkInformationApi instance
     * @param options Configuration options for the network measurement
     */
    constructor(options: NetworkInformationConfig = {}) {
        super();

        const config: Required<NetworkInformationConfig> = {
            cfOrigin: 'https://speed.cloudflare.com',
            estimatedServerTime: 10,
            estimatedHeaderFraction: 0.005,
            measurementCount: 2,
            baseMeasurementSize: 100000,
            measurementSizeMultiplier: 2,
            periodicMeasurement: false,
            measurementInterval: 30000,
            ...options,
        };

        this._cfOrigin = config.cfOrigin;
        this._estimatedServerTime = config.estimatedServerTime;
        this._estimatedHeaderFraction = config.estimatedHeaderFraction;
        this._measurementCount = config.measurementCount;
        this._baseMeasurementSize = config.baseMeasurementSize;
        this._measurementSizeMultiplier = config.measurementSizeMultiplier;
        this._periodicMeasurement = config.periodicMeasurement;
        this._measurementInterval = config.measurementInterval;

        this._init();
    }

    // W3C Network Information Api properties
    /** Downlink speed in Mbps */
    get downlink(): number | undefined {
        return this._downlink;
    }
    /** Uplink speed in Mbps */
    get uplink(): number | undefined {
        return this._uplink;
    }
    /** Round-trip time in milliseconds */
    get rtt(): number | undefined {
        return this._rtt;
    }
    /** Effective connection type classification */
    get effectiveType(): EffectiveConnectionType | undefined {
        return this._effectiveType;
    }
    /** Whether data saving mode is enabled */
    get saveData(): boolean {
        return this._saveData;
    }
    /** Connection type */
    get type(): string {
        return this._type;
    }

    /**
     * Dispatch a network change event
     * @param type Event type
     * @param data Event data
     */
    protected _dispatchNetworkEvent(
        type: string,
        data: NetworkChangeEventDetail = {},
    ): void {
        const event = new CustomEvent(type, { detail: data });
        this.dispatchEvent(event);
    }

    /**
     * Initialize the network measurement system
     */
    protected async _init(): Promise<void> {
        await this._performMeasurement();

        if (this._periodicMeasurement) {
            this._startPeriodicMeasurements();
        }
    }

    /**
     * Start periodic network measurements
     */
    protected _startPeriodicMeasurements(): void {
        setInterval(() => {
            if (
                !this._measuring &&
                Date.now() - this._lastMeasurement > this._measurementInterval
            ) {
                this._performMeasurement();
            }
        }, 10000);
    }

    /**
     * Perform a network measurement cycle
     */
    protected async _performMeasurement(): Promise<void> {
        if (this._measuring) return;

        this._measuring = true;
        this._lastMeasurement = Date.now();

        try {
            const measurements = await this._measureNetworkSpeed();
            this._updateFromMeasurements(measurements);
        } catch {
            // Silent failure
        } finally {
            this._measuring = false;
        }
    }

    /**
     * Measure network speed using multiple test sizes
     * @returns Array of network measurements
     */
    protected async _measureNetworkSpeed(): Promise<NetworkMeasurement[]> {
        const uid = this._pseudoRandomHash(5);
        const measurements: NetworkMeasurement[] = [];

        for (let i = 0; i < this._measurementCount; i++) {
            try {
                const measurementSize = this._baseMeasurementSize *
                    Math.pow(this._measurementSizeMultiplier, i);

                // Measure latency
                const latencyStartTime = performance.now();
                const latencyRes = await fetch(
                    `${this._cfOrigin}/__down?measId=${uid}&bytes=0&i=${i}`,
                );
                await latencyRes.text();
                const latencyEndTime = performance.now();

                await new Promise((resolve) => setTimeout(resolve, 50));

                // Measure download
                const downloadStartTime = performance.now();
                const downloadRes = await fetch(
                    `${this._cfOrigin}/__down?measId=${uid}&bytes=${measurementSize}&i=${i}`,
                );
                await downloadRes.text();
                const downloadEndTime = performance.now();
                const downloadDuration = downloadEndTime - downloadStartTime;

                await new Promise((resolve) => setTimeout(resolve, 50));
                const latencyTiming = this._buildTiming(
                    latencyRes,
                    latencyStartTime,
                    latencyEndTime,
                );

                const serverTime =
                    this._getServerTimeFromResponse(downloadRes) ||
                    this._estimatedServerTime;
                const networkTime = Math.max(1, downloadDuration - serverTime);
                const bits = 8 *
                    (measurementSize * (1 + this._estimatedHeaderFraction));
                const bps = bits / (networkTime / 1000);
                const calculatedMbps = bps / 1000000;

                if (latencyTiming) {
                    const measurement: NetworkMeasurement = {
                        rtt: latencyTiming.ping,
                        downlink: calculatedMbps,
                        measurementSize,
                        duration: networkTime,
                        realDuration: downloadDuration,
                        timestamp: Date.now(),
                    };

                    measurements.push(measurement);

                    if (i === 0) {
                        this._updateFromFirstMeasurement(measurement);
                    }
                }
            } catch {
                // Silent failure for individual measurements
            }

            if (i < this._measurementCount - 1) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        return measurements;
    }

    /**
     * Update network properties from first measurement for immediate feedback
     * @param measurement The first measurement result
     */
    protected _updateFromFirstMeasurement(
        measurement: NetworkMeasurement,
    ): void {
        this._rtt = measurement.rtt;
        this._downlink = measurement.downlink;
        this._uplink = measurement.downlink * 0.5;
        this._effectiveType = this._classifyConnection(
            measurement.downlink,
            measurement.rtt,
        );

        this._dispatchNetworkEvent('change', {
            downlink: this._downlink,
            uplink: this._uplink,
            rtt: this._rtt,
            effectiveType: this._effectiveType,
            preliminary: true,
        });
    }

    /**
     * Update network properties from all measurements using median values
     * @param measurements Array of measurement results
     */
    protected _updateFromMeasurements(
        measurements: NetworkMeasurement[],
    ): void {
        if (measurements.length === 0) return;

        const prevEffectiveType = this._effectiveType;

        const rtts = measurements.map((m) => m.rtt).sort((a, b) => a - b);
        const downlinks = measurements.map((m) => m.downlink).sort((a, b) =>
            a - b
        );

        this._rtt = this._median(rtts);
        this._downlink = this._median(downlinks);
        this._uplink = this._downlink * 0.5;

        this._effectiveType = this._classifyConnection(
            this._downlink,
            this._rtt,
        );

        if (
            prevEffectiveType !== this._effectiveType || measurements.length > 1
        ) {
            this._dispatchNetworkEvent('change', {
                downlink: this._downlink,
                uplink: this._uplink,
                rtt: this._rtt,
                effectiveType: this._effectiveType,
                preliminary: false,
            });
        }
    }

    /**
     * Classify connection type based on speed and latency
     * @param downlinkMbps Downlink speed in Mbps
     * @param rttMs Round-trip time in milliseconds
     * @returns Effective connection type
     */
    protected _classifyConnection(
        downlinkMbps: number,
        rttMs: number,
    ): EffectiveConnectionType {
        if (downlinkMbps === 0 || !isFinite(downlinkMbps) || rttMs > 2000) {
            return 'slow-2g';
        }

        if (downlinkMbps < 0.15 || rttMs > 400) {
            return 'slow-2g';
        } else if (downlinkMbps < 0.65 || rttMs > 150) {
            return '2g';
        } else if (downlinkMbps < 4.5 || rttMs > 50) {
            return '3g';
        } else {
            return '4g';
        }
    }

    /**
     * Calculate median value from array of numbers
     * @param arr Array of numbers
     * @returns Median value
     */
    protected _median(arr: number[]): number {
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    }

    /**
     * Generate pseudo-random hash for measurement identification
     * @param length Length of hash string
     * @returns Random hash string
     */
    protected _pseudoRandomHash(length: number = 7): string {
        let str = (Math.random() + 1).toString(36).substring(2);

        // Fallback if the result is too short
        while (str.length < length) {
            str += Math.random().toString(36).substring(2);
        }

        return str.substring(0, length);
    }

    /**
     * Build timing information from fetch response
     * @param res Fetch response object
     * @returns Timing data or null if unavailable
     */
    protected _buildTiming(
        res: Response,
        startTime?: number,
        endTime?: number,
    ): {
        ping: number;
        bps: number;
        duration: number;
        perf?: PerformanceResourceTiming;
    } | null {
        const perf = performance.getEntriesByType('resource')
            .find((p) => p.name === res.url) as PerformanceResourceTiming;

        if (perf) {
            const serverTime = this._getServerTimeFromResponse(res);
            const ttfb = perf.responseStart - perf.requestStart;
            const payloadDownloadTime = perf.responseEnd - perf.responseStart;

            const ping = Math.max(
                0.01,
                ttfb - (serverTime || this._estimatedServerTime),
            );
            const duration = ping + payloadDownloadTime;

            const numBytes = new URL(perf.name).searchParams.get('bytes');
            const bits = 8 *
                (perf.transferSize ||
                    (+numBytes! * (1 + this._estimatedHeaderFraction)));
            const bps = bits / (duration / 1000);

            return { ping, bps, duration, perf };
        } else if (startTime !== undefined && endTime !== undefined) {
            // fallback: use manual timings
            const duration = endTime - startTime;
            // You may not have all details like serverTime, but can estimate
            return { ping: duration, bps: 0, duration, perf: undefined };
        } else {
            return null;
        }
    }

    /**
     * Extract server processing time from response headers
     * @param res Fetch response object
     * @returns Server time in milliseconds or null
     */
    protected _getServerTimeFromResponse(res: Response): number | null {
        const serverTiming = res.headers.get('server-timing');
        if (serverTiming) {
            const match = serverTiming.match(/dur=([0-9.]+)/);
            if (match) return +match[1];
        }
        return null;
    }

    /**
     * Manually trigger a network measurement
     * @returns Promise that resolves when measurement is complete
     */
    public async measure(): Promise<void> {
        return this._performMeasurement();
    }

    /**
     * Get current connection information
     * @returns Object containing current network measurements
     */
    public getConnectionInfo(): ConnectionInfo {
        return {
            downlink: this._downlink,
            uplink: this._uplink,
            rtt: this._rtt,
            effectiveType: this._effectiveType,
            saveData: this._saveData,
            type: this._type,
        };
    }
}
