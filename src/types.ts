/** Possible effective connection types */
export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

/** Network type definition with connection characteristics */
export interface NetworkType {
    /** Downlink speed in Mbps */
    downlink: number;
    /** Uplink speed in Mbps */
    uplink: number;
    /** Round-trip time in milliseconds */
    rtt: number;
    /** Effective connection type classification */
    effectiveType: EffectiveConnectionType;
}

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

/** Configuration options for NetworkInformationApi */
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
}

/** Optional dependencies for the NetworkInformationApi */
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
    initiatorType: string;
    nextHopProtocol: string;
    workerStart: number;
    redirectStart: number;
    redirectEnd: number;
    fetchStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    secureConnectionStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
    serverTiming: PerformanceServerTiming[];

    toJSON(): any;
}

export interface PerformanceServerTiming {
    name: string;
    duration: number;
    description: string;
}
