import winston from "winston";

winston.emitErrs = true;

// need to set logging "level" based on config instead of hard-coded here
const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: 'info',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ]
});
export default logger;
