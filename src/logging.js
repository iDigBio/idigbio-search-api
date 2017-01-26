import winston from "winston";

winston.emitErrs = true;

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ]
});
export default logger;
