/**
 * Jest Test Setup
 * Configures the test environment for DOM testing
 */

// Mock global functions that might not be available in test environment
global.fetch = require('node-fetch');

// Mock console methods to reduce noise during testing
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock browser APIs
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(window, 'alert', {
  value: jest.fn(),
  writable: true
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};