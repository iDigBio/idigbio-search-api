import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import logger from "logging";

export default async function writeMock(result, filename, qstring) {
  try {
    const b = _.omit(result, 'took');
    const json = JSON.stringify({query: qstring, response_snapshot: b}, null, 2);
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
