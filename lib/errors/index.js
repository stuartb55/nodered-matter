/**
 * Custom error classes for Matter plugin
 * Provides structured error handling with user-friendly messages
 */

class MatterError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Ensure proper prototype chain for instanceof checks
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

class CommissioningError extends MatterError {
    constructor(message, code = 'COMMISSIONING_FAILED', details = {}) {
        super(message, code, details);
        this.type = 'commissioning';
    }
}

class DeviceNotFoundError extends MatterError {
    constructor(message, code = 'DEVICE_NOT_FOUND', details = {}) {
        super(message, code, details);
        this.type = 'device';
    }
}

class NetworkError extends MatterError {
    constructor(message, code = 'NETWORK_ERROR', details = {}) {
        super(message, code, details);
        this.type = 'network';
    }
}

class ConfigurationError extends MatterError {
    constructor(message, code = 'CONFIG_ERROR', details = {}) {
        super(message, code, details);
        this.type = 'configuration';
    }
}

class ClusterError extends MatterError {
    constructor(message, code = 'CLUSTER_ERROR', details = {}) {
        super(message, code, details);
        this.type = 'cluster';
    }
}

class TimeoutError extends MatterError {
    constructor(message, code = 'TIMEOUT', details = {}) {
        super(message, code, details);
        this.type = 'timeout';
    }
}

class ValidationError extends MatterError {
    constructor(message, code = 'VALIDATION_ERROR', details = {}) {
        super(message, code, details);
        this.type = 'validation';
    }
}

module.exports = {
    MatterError,
    CommissioningError,
    DeviceNotFoundError,
    NetworkError,
    ConfigurationError,
    ClusterError,
    TimeoutError,
    ValidationError
};
