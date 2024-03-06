import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import config from "config";
import logger from "logging";
import hash from "lib/hasher";

const esclient = require.requireActual('esclient').default;

const MOCKDIR = '__tests__/mock';

logger.info("Using mocks from, %s", fs.realpathSync(MOCKDIR)); // eslint-disable-line no-sync

async function writeMock(result, filename, qstring) {
  try {
    const b = _.omit(result, 'took');
    const json = JSON.stringify(b, null, 2);
    logger.log(json.length > (2 ** 20) ? "warn" : "debug",
               "Writing new mock (%dMB) for %s", Math.round(100 * json.length / (2 ** 20)) / 100, qstring);
    fs.writeFileAsync(filename, json, {flag: 'wx'})
      .catch(function(err) {
        if(err.code !== "EEXIST") {
          logger.error("Failed writing mock to %s", filename, err);
        }
      });
  } catch (err) {
    logger.error("Error scheduling write", err);
  }
  return result;
}

function wrap(name) {
  const lookup = _.includes(name, '.') ? _.split(name, '.').slice(0, -1) : null;
  
  return async function(...args) {
    const h = hash("md5", args);
    const filename = `${MOCKDIR}/${name}-${h}.json`;
    logger.info("filename: ", filename);

    fs.stat(filename, function(err, stat) {
      if(err == null) {
          logger.info("fstat check: file exists -- %s", filename);
      } else if(err.code == 'ENOENT') {
          logger.error("fstat check: file does not exist -- %s", filename, err);
      } 
    });

    const qstring = `${name}(${JSON.stringify(args)})`;
    try {
      return JSON.parse(await fs.readFileAsync(filename));
    } catch (err) {
      if(config.CI) {
        throw new Error(`No JSON mock for ${qstring}`);
      }
    }
    const client = esclient(),
          fn = _.get(client, name),
          ctx = lookup ? _.get(client, lookup) : client;
          

    const result = await fn.apply(ctx, args);

    writeMock(result, filename, qstring);
    return result;
  };
}

const client = {};
_.forEach(["get", "search", "count", "indices.getMapping"], function(name) {
  _.set(client, name, wrap(name));
});

export default () => client;
