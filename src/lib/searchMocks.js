
import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import logger from "logging";
import hash from "./hasher";

const mockdir = '__tests__/mock/';

export function writeMockWrapper(fn) {
  return async function (index, type, op, query, statsInfo) {
    const result = await fn.apply(null, arguments);
    try {
      const h = hash("sha256", [index, type, op, query]);
      var b = _.cloneDeep(result),
          filename = mockdir + h + ".json";
      delete b.took;
      fs.writeFileAsync(filename, JSON.stringify(b, null, 2), {flag: 'wx'})
        .then(function() {
          logger.debug('Writing new result mock for "/%s/%s/%s? %j', index, type, op, query);
        })
        .catch(function(err) {
          if(err.code !== "EEXIST") {
            logger.error("Failed writing mock to %s", filename, err);
          }
        });
    } catch (err) {
      logger.error("Error scheduling write", err);
    }
    return result;
  };
}

export async function readMock(index, type, op, query, statsInfo) {
  const h = hash("sha256", [index, type, op, query]);
  const filename = mockdir + h + ".json";
  try {
    return JSON.parse(await fs.readFileAsync(filename));
  } catch (err) {
    const msg = "No json mock for " + h;
    console.error(msg);
    throw new Error(msg);
  }
}
