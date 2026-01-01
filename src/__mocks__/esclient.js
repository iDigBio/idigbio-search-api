import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import config from "config";
import logger from "logging";
import hash from "lib/hasher";
import writeMock from "./writeMock";

const esclient = require.requireActual('esclient').default;

const MOCKDIR = '__tests__/mock';

logger.info("Using mocks from, %s", fs.realpathSync(MOCKDIR)); // eslint-disable-line no-sync

function wrap(name) {
  const lookup = _.includes(name, '.') ? _.split(name, '.').slice(0, -1) : null;
  
  return async function(...args) {
    // Verify parameter length for the hash normalisation I'm about to do.
    // Surely this is only used for testing, so bold assumptions are okay, yeah?
    if (args.length > 1)
      throw new TypeError('Unexpected number of parameters to wrap');
    const h = hash("md5", _.omit(args[0], 'index'));
      // Without _.omit(), a change in index name will cause entirely different
      // hashes, which would be incomparable.
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
      const jp = JSON.parse(await fs.readFileAsync(filename));
      return jp.response_snapshot;
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
