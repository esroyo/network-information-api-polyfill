import type {
    ConnectionClassification,
    ConnectionInfo,
    EffectiveConnectionType,
    NetworkChangeEventDetail,
    NetworkInformationConfig,
    NetworkInformationServices,
    NetworkMeasurement,
    NetworkType,
    PerformanceResourceTiming,
} from './types.ts';

/**
 * Network Information Api implementation providing real-time network measurement
 * with configurable classification tables
 *
 * @example
 * ```typescript
 * // Use default WICG classification
 * import { CLASSIFICATION } from './classifications/wicg.ts';
 * const networkApi = new NetworkInformation({
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
export class NetworkInformation extends EventTarget {
    protected readonly _cfOrigin: string;
    protected readonly _estimatedServerTime: number;
    protected readonly _estimatedHeaderFraction: number;
    protected readonly _measurementCount: number;
    protected readonly _baseMeasurementSize: number;
    protected readonly _measurementSizeMultiplier: number;
    protected readonly _periodicMeasurement: boolean;
    protected readonly _measurementInterval: number;
    protected readonly _fetch: typeof fetch;
    protected readonly _classificationTable: ConnectionClassification[];

    protected _downlink?: number;
    protected _uplink?: number;
    protected _rtt?: number;
    protected _effectiveType?: EffectiveConnectionType;
    protected _saveData: boolean = false;
    protected _type: NetworkType = 'unknown';

    protected _measuring: boolean = false;
    protected _lastMeasurement: number = 0;
    protected _periodicTimer?: number;

    /**
     * Create a new NetworkInformation instance
     * @param options Configuration options for the network measurement
     * @param services Injectable services for testing
     */
    constructor(
        options: NetworkInformationConfig,
        services: NetworkInformationServices = {},
    ) {
        super();

        // Apply configuration with defaults
        this._cfOrigin = options.cfOrigin ?? 'https://speed.cloudflare.com';
        this._estimatedServerTime = options.estimatedServerTime ?? 10;
        this._estimatedHeaderFraction = options.estimatedHeaderFraction ?? 0.005;
        this._measurementCount = options.measurementCount ?? 2;
        this._baseMeasurementSize = options.baseMeasurementSize ?? 100_000;
        this._measurementSizeMultiplier = options.measurementSizeMultiplier ?? 2;
        this._periodicMeasurement = options.periodicMeasurement ?? false;
        this._measurementInterval = options.measurementInterval ?? 30_000;
        this._classificationTable = options.classificationTable;

        this._fetch = services.fetch ?? fetch.bind(null);

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
    get type(): NetworkType {
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
        this.dispatchEvent(new CustomEvent(type, { detail: data }));
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
        this._periodicTimer = setInterval(() => {
            if (this._canPerformMeasurement()) {
                this._performMeasurement();
            }
        }, 10_000);
    }

    /**
     * Check if measurement can be performed
     */
    protected _canPerformMeasurement(): boolean {
        return !this._measuring &&
            Date.now() - this._lastMeasurement > this._measurementInterval;
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
     * Create measurement URL for given parameters
     */
    protected _createMeasurementUrl(
        uid: string,
        bytes: number,
        index: number,
    ): string {
        return `${this._cfOrigin}/__down?measId=${uid}&bytes=${bytes}&i=${index}`;
    }

    /**
     * Perform a single measurement
     * @returns A network measurement
     */
    protected async _performSingleMeasurement(
        uid: string,
        measurementSize: number,
        index: number,
    ): Promise<NetworkMeasurement | null> {
        try {
            // Measure latency
            const latencyResult = await this._measureLatency(uid, index);
            if (!latencyResult) return null;

            await this._delay(50);

            // Measure download
            const downloadResult = await this._measureDownload(
                uid,
                measurementSize,
                index,
            );
            if (!downloadResult) return null;

            return {
                rtt: latencyResult.ping,
                downlink: downloadResult.mbps,
                measurementSize,
                duration: downloadResult.networkTime,
                realDuration: downloadResult.totalTime,
                timestamp: Date.now(),
            };
        } catch {
            return null;
        }
    }

    /**
     * Perform latency measurement
     */
    protected async _measureLatency(
        uid: string,
        index: number,
    ): Promise<{ ping: number } | null> {
        const startTime = performance.now();
        const response = await this._fetch(
            this._createMeasurementUrl(uid, 0, index),
        );
        await response.text();
        const endTime = performance.now();

        const timing = this._buildTiming(response, startTime, endTime);
        return timing ? { ping: timing.ping } : null;
    }

    /**
     * Perform download measurement
     */
    protected async _measureDownload(
        uid: string,
        measurementSize: number,
        index: number,
    ): Promise<
        { mbps: number; networkTime: number; totalTime: number } | null
    > {
        const startTime = performance.now();
        const response = await this._fetch(
            this._createMeasurementUrl(uid, measurementSize, index),
        );
        await response.text();
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        const serverTime = this._getServerTimeFromResponse(response) ||
            this._estimatedServerTime;
        const networkTime = Math.max(1, totalTime - serverTime);
        const bits = 8 *
            (measurementSize * (1 + this._estimatedHeaderFraction));
        const bps = bits / (networkTime / 1_000);
        const mbps = bps / 1_000_000;

        return { mbps, networkTime, totalTime };
    }

    /**
     * Measure network speed using multiple test sizes
     */
    protected async _measureNetworkSpeed(): Promise<NetworkMeasurement[]> {
        const uid = this._pseudoRandomHash(5);
        const measurements: NetworkMeasurement[] = [];

        for (let i = 0; i < this._measurementCount; i++) {
            const measurementSize = this._baseMeasurementSize *
                Math.pow(this._measurementSizeMultiplier, i);

            const measurement = await this._performSingleMeasurement(
                uid,
                measurementSize,
                i,
            );

            if (measurement) {
                measurements.push(measurement);
                if (i === 0 && this._measurementCount > 1) {
                    this._updateNetworkProperties(
                        measurement.downlink,
                        measurement.rtt,
                        true,
                    );
                }
            }

            if (i < this._measurementCount - 1) {
                await this._delay(200);
            }
        }

        return measurements;
    }

    /**
     * Update network properties with common logic
     */
    protected _updateNetworkProperties(
        downlink: number,
        rtt: number,
        isPreliminary: boolean = false,
    ): void {
        const prevEffectiveType = this._effectiveType;

        this._downlink = downlink;
        this._rtt = rtt;
        this._uplink = downlink * 0.5;
        this._effectiveType = this._classifyConnection(downlink, rtt);

        if (prevEffectiveType !== this._effectiveType || !isPreliminary) {
            this._dispatchNetworkEvent('change', {
                downlink: this._downlink,
                uplink: this._uplink,
                rtt: this._rtt,
                effectiveType: this._effectiveType,
                preliminary: isPreliminary,
            });
        }
    }

    /**
     * Update network properties from all measurements using median values
     * @param measurements Array of measurement results
     */
    protected _updateFromMeasurements(
        measurements: NetworkMeasurement[],
    ): void {
        if (measurements.length === 0) return;

        const rtts = measurements.map((m) => m.rtt).sort((a, b) => a - b);
        const downlinks = measurements.map((m) => m.downlink).sort((a, b) =>
            a - b
        );

        this._updateNetworkProperties(
            this._median(downlinks),
            this._median(rtts),
            false,
        );
    }

    /**
     * Classify connection type based on speed and latency using the configured table
     * @param downlinkMbps Downlink speed in Mbps
     * @param rttMs Round-trip time in milliseconds
     * @returns Effective connection type
     */
    protected _classifyConnection(
        downlinkMbps: number,
        rttMs: number,
    ): EffectiveConnectionType {
        // Handle edge cases first
        if (!isFinite(downlinkMbps) || downlinkMbps <= 0 || !isFinite(rttMs) || rttMs < 0) {
            // Return the slowest classification type
            return this._classificationTable[0].type;
        }

        // Check each classification in order (slowest to fastest)
        for (const classification of this._classificationTable) {
            const exceedsDownlinkLimit = classification.maxDownlink !== undefined && 
                                       downlinkMbps < classification.maxDownlink;
            const exceedsRttLimit = classification.minRtt !== undefined && 
                                  rttMs > classification.minRtt;

            // Use OR logic: classify as this type if either condition is met
            if (exceedsDownlinkLimit || exceedsRttLimit) {
                return classification.type;
            }
        }

        // If no limits are exceeded, return the fastest type (last in table)
        return this._classificationTable[this._classificationTable.length - 1].type;
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

        const url = new URL(res.url);
        const numBytes = parseInt(url.searchParams.get('bytes') || '0', 10);
        const serverTime = this._getServerTimeFromResponse(res) ||
            this._estimatedServerTime;

        let ping: number;
        let networkDuration: number;
        let transferSize: number;

        if (perf) {
            const ttfb = perf.responseStart - perf.requestStart;
            const payloadDownloadTime = perf.responseEnd - perf.responseStart;

            ping = Math.max(0.01, ttfb - serverTime);
            networkDuration = ping + payloadDownloadTime;
            transferSize = perf.transferSize ||
                (numBytes * (1 + this._estimatedHeaderFraction));
        } else if (startTime !== undefined && endTime !== undefined) {
            const totalDuration = endTime - startTime;
            networkDuration = Math.max(1, totalDuration - serverTime);

            ping = numBytes === 0
                ? Math.max(1, networkDuration * 0.9)
                : Math.min(networkDuration * 0.3, 200);

            transferSize = numBytes * (1 + this._estimatedHeaderFraction);
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

    protected _delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Generate pseudo-random hash for measurement identification
     * @param length Length of hash string
     * @returns Random hash string
     */
    protected _pseudoRandomHash(length: number = 7): string {
        let str = '';
        while (str.length < length) {
            str += (Math.random() + 1).toString(36).substring(2);
        }
        return str.substring(0, length);
    }

    /**
     * Extract server processing time from response headers
     * @param res Fetch response object
     * @returns Server time in milliseconds or null
     */
    protected _getServerTimeFromResponse(res: Response): number | null {
        const serverTiming = res.headers.get('server-timing');
        if (serverTiming) {
            const match = serverTiming.match(/.*dur=([0-9.]+)/);
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

    /**
     * Dispose of the NetworkInformation instance and cleanup resources
     * Call this when you no longer need the instance to prevent memory leaks
     */
    public dispose(): void {
        // Clear the periodic measurement timer
        if (this._periodicTimer !== undefined) {
            clearInterval(this._periodicTimer);
            this._periodicTimer = undefined;
        }

        // Cancel any ongoing measurements (best effort)
        this._measuring = false;

        // Clear all event listeners
        // Note: EventTarget doesn't have a removeAllListeners method,
        // so consumers should manually remove their listeners before calling dispose()
    }
}
