/**
 * Jest test setup and configuration
 */

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock Node-RED environment
global.RED = {
    nodes: {
        createNode: jest.fn(),
        registerType: jest.fn(),
        getNode: jest.fn()
    },
    settings: {
        userDir: '/tmp/node-red'
    },
    httpAdmin: {
        post: jest.fn(),
        get: jest.fn()
    },
    auth: {
        needsPermission: jest.fn()
    },
    log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
};

// Mock filesystem operations
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => args.join('/'))
}));

// Mock os operations
jest.mock('os', () => ({
    homedir: jest.fn(() => '/home/user')
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
