import logger from "logging";

export default function timer(...args) {
  let name = null;
  let fn = null;
  if(args.length === 1) {
    fn = args[0];
    name = fn.name;
  } else if(args.length === 2) {
    [name, fn] = args;
  } else {
    throw new Error("Incorrect number of arguments to timer.");
  }
  return async function(...args) {
    logger.profile(name);
    try {
      return await fn(...args);
    } finally {
      logger.profile(name);
    }
  };
}
