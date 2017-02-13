/* eslint require-jsdoc: "off" */
/* eslint max-params: "off" */

import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import config from "config";
import logger from "logging";
import hash from "lib/hasher";

const searchShim = require.requireActual('searchShim');

const MOCKDIR = '__tests__/mock/';

logger.info("Using mocks from %s", fs.realpathSync(MOCKDIR));

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

export default async function(index, type, op, query, statsInfo) {
  const qstring = `"/${index}/${type}/${op}? ${JSON.stringify(query)}"`;
  const h = hash("sha256", [index, type, op, query]);
  const filename = MOCKDIR + h + ".json";
  try {
    return JSON.parse(await fs.readFileAsync(filename));
  } catch (err) {
    if(config.CI) {
      throw new Error(`No JSON mock for ${qstring}"`);
    }
  }
  const result = await searchShim.apply(null, arguments);
  writeMock(result, filename, qstring);
  return result;
}
