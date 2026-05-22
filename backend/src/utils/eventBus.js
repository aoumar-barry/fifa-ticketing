const EventEmitter = require('events');

/**
 * Application-wide event bus (singleton).
 * Used for internal event-driven communication between services.
 *
 * Events:
 *   - 'match:updated' → { match, changes }
 */
const eventBus = new EventEmitter();

// Increase default max listeners to avoid warnings in production
eventBus.setMaxListeners(20);

module.exports = eventBus;
