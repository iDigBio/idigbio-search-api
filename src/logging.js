import winston from "winston";

winston.emitErrs = true;

// need to set logging "level" based on config instead of hard-coded
const config = require('config');

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

logger.info("** inside logging.js, config.LOGGER_LEVEL = %s", config.LOGGER_LEVEL);
logger.info("Winston logger using level: %s",logger.level);

export default logger;
