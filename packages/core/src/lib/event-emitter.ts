import { Listeners } from 'src/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<Events extends Record<string, any>> {
  private listeners: Listeners<Events> = {};

  on<K extends keyof Events>(event: K, listener: Events[K]): void {
    this.listeners = Object.assign({}, this.listeners, {
      [event]: (this.listeners[event] ?? []).concat(listener),
    });
  }

  off<K extends keyof Events>(event: K, listener: Events[K]): void {
    if (!this.listeners[event]) return;

    this.listeners = Object.assign({}, this.listeners, {
      [event]: (this.listeners[event] ?? []).filter((l) => l !== listener),
    });
  }

  remove<K extends keyof Events>(event: K): void {
    delete this.listeners[event];
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach((listener) => listener(...args));
  }
}
