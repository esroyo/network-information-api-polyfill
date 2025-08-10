/** Possible effective connection types */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

export type NetworkType =
    | 'bluetooth'
    | 'cellular'
    | 'ethernet'
    | 'none'
    | 'wifi'
    | 'wimax'
    | 'other'
    | 'unknown';

/** Individual network measurement result */
export interface NetworkMeasurement {
    /** Round-trip time in milliseconds */
    rtt: number;
    /** Measured downlink speed in Mbps */
    downlink: number;
    /** Size of data measured in bytes */
    measurementSize: number;
    /** Network duration excluding server time */
    duration: number;
    /** Total measurement duration including server time */
    realDuration: number;
    /** Timestamp when measurement was taken */
    timestamp: number;
}

/** Configuration options for NetworkInformation */
export interface NetworkInformationConfig {
    /** Cloudflare origin URL for speed tests */
    cfOrigin?: string;
    /** Estimated server processing time in milliseconds */
    estimatedServerTime?: number;
    /** Estimated fraction of data that is headers */
    estimatedHeaderFraction?: number;
    /** Number of measurements to perform */
    measurementCount?: number;
    /** Base size for first measurement in bytes */
    baseMeasurementSize?: number;
    /** Multiplier for subsequent measurement sizes */
    measurementSizeMultiplier?: number;
    /** Whether to perform periodic re-measurements */
    periodicMeasurement?: boolean;
    /** Interval between periodic measurements in milliseconds */
    measurementInterval?: number;
    /** Custom classification table (required - no default) */
    classificationTable: ConnectionClassification[];
}

/** Optional dependencies for the NetworkInformation */
export interface NetworkInformationServices {
    /** Fetch API */
    fetch?: typeof fetch;
}

/** Connection information matching W3C Network Information Api */
export interface ConnectionInfo {
    /** Downlink speed in Mbps */
    downlink?: number;
    /** Uplink speed in Mbps */
    uplink?: number;
    /** Round-trip time in milliseconds */
    rtt?: number;
    /** Effective connection type */
    effectiveType?: EffectiveConnectionType;
    /** Whether data saving mode is enabled */
    saveData: boolean;
    /** Connection type */
    type: string;
}

/** Event detail for network change events */
export interface NetworkChangeEventDetail {
    /** Downlink speed in Mbps */
    downlink?: number;
    /** Uplink speed in Mbps */
    uplink?: number;
    /** Round-trip time in milliseconds */
    rtt?: number;
    /** Effective connection type */
    effectiveType?: EffectiveConnectionType;
    /** Whether this is a preliminary result */
    preliminary?: boolean;
}

export interface PerformanceResourceTiming extends PerformanceEntry {
    transferSize: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
}

export interface ConnectionClassification {
    type: EffectiveConnectionType;
    /** Maximum downlink speed in Mbps (exclusive) */
    maxDownlink?: number;
    /** Minimum RTT in milliseconds (exclusive) */
    minRtt?: number;
    /** Human readable description */
    description?: string;
}

/** NetworkInformation interface */
export interface NetworkInformationLike {
    // W3C Network Information API properties
    readonly downlink?: number;
    readonly uplink?: number;
    readonly rtt?: number;
    readonly effectiveType?: EffectiveConnectionType;
    readonly saveData: boolean;
    readonly type: NetworkType;

    // Methods
    measure(): Promise<void>;
    getConnectionInfo(): ConnectionInfo;
    dispose(): void;
    addEventListener(
        type: string,
        listener: (event: CustomEvent<NetworkChangeEventDetail>) => void,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: (event: CustomEvent<NetworkChangeEventDetail>) => void,
        options?: EventListenerOptions | boolean,
    ): void;
}
