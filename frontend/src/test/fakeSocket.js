import { vi } from 'vitest';

/**
 * Minimal stand-in for a socket.io-client socket: records handlers and emits,
 * and lets a test play server events into the component.
 */
export function createFakeSocket() {
  const handlers = new Map();
  return {
    connected: false,
    on: vi.fn((event, handler) => {
      handlers.set(event, [...(handlers.get(event) || []), handler]);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    serverEmit(event, payload) {
      if (event === 'connect') this.connected = true;
      for (const handler of handlers.get(event) || []) handler(payload);
    },
  };
}
