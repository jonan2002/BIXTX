const LEVEL = process.env.LOG_LEVEL || "info";
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const cur = LEVELS[LEVEL] ?? 2;

const fmt = (lvl, ...a) => {
  if (LEVELS[lvl] > cur) return;
  const ts = new Date().toISOString();
  console[lvl === "error" ? "error" : lvl === "warn" ? "warn" : "log"](`[${ts}] [${lvl.toUpperCase()}]`, ...a);
};

module.exports = {
  error: (...a) => fmt("error", ...a),
  warn:  (...a) => fmt("warn",  ...a),
  info:  (...a) => fmt("info",  ...a),
  debug: (...a) => fmt("debug", ...a),
};
