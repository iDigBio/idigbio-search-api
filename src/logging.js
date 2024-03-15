import winston from "winston";

import config from "./config";

winston.emitErrs = true;

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: config.LOGGER_LEVEL,
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ]
});
export default logger;

/**
 * Exits this node process after log flush and the elapsed {@link delayMs} (if provided).\
 * A short delay is desireable to allow for logging errors in these final moments.
 * 
 * @param {number} exitCode Application exit status code to use
 * @param {number} delayMs In milliseconds. Any specified delay greater than 0 is used in {@link setTimeout}.\
 *    Otherwise, this method simply waits for flush.
 */
export function exitAfterFlushAndWait(exitCode = 1, delayMs = 1000) {
  let
    flushed = false,
    waited = false;

  if (delayMs > 0) {
    setTimeout(() => {
      waited = true;
      if (flushed) process.exit(exitCode);
    }, delayMs);
  }

  // logger.on('finished', ...) not available until winston>=3.x
  // For now, using 'logged' event, which is why this method gives the option to wait
  logger.on('logged', () => {
    flushed = true;
    if (waited) process.exit(exitCode);
  });

  // Recheck the two flags in the event they both get set at the same time (data race)
  setInterval(() => {
    if (flushed && waited)
      process.exit(exitCode);
  }, 100 /*ms*/);
}
