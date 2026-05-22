const EventEmitter = require('events');

describe('eventBus', () => {
  let eventBus;

  beforeEach(() => {
    // Require a fresh copy to avoid shared state between tests
    jest.resetModules();
    eventBus = require('../../../src/utils/eventBus');
  });

  test('is an instance of EventEmitter', () => {
    expect(eventBus).toBeInstanceOf(EventEmitter);
  });

  test('emits and receives events correctly', () => {
    const handler = jest.fn();
    eventBus.on('test:event', handler);

    const payload = { data: 'hello' };
    eventBus.emit('test:event', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);

    eventBus.removeListener('test:event', handler);
  });

  test('can register multiple listeners on the same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    eventBus.on('multi:event', handler1);
    eventBus.on('multi:event', handler2);

    eventBus.emit('multi:event', { value: 42 });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    eventBus.removeListener('multi:event', handler1);
    eventBus.removeListener('multi:event', handler2);
  });

  test('does not call handler after it is removed', () => {
    const handler = jest.fn();
    eventBus.on('remove:event', handler);

    eventBus.emit('remove:event', {});
    expect(handler).toHaveBeenCalledTimes(1);

    eventBus.removeListener('remove:event', handler);

    eventBus.emit('remove:event', {});
    expect(handler).toHaveBeenCalledTimes(1); // still 1
  });

  test('has max listeners set to at least 20', () => {
    expect(eventBus.getMaxListeners()).toBeGreaterThanOrEqual(20);
  });
});
