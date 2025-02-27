/* eslint require-jsdoc: "off" */
/* eslint max-params: "off" */

import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import config from "config";
import logger from "logging";
import hash from "lib/hasher";
import writeMock from "./writeMock";

const searchShim = require.requireActual('searchShim');

const MOCKDIR = '__tests__/mock/';

logger.info("Using mocks from %s", fs.realpathSync(MOCKDIR));

export default async function(index, type, op, query, statsInfo) {
  const qstring = `"/${index}/${type}/${op}? ${JSON.stringify(query)}"`;
  const h = hash("sha256", [type, op, query]);
  const filename = MOCKDIR + h + ".json";
  try {
    const jp = JSON.parse(await fs.readFileAsync(filename));
    return jp.response_snapshot;
  } catch (err) {
    if(config.CI) {
      throw new Error(`No JSON mock for ${qstring}"`);
    }
  }
  const result = await searchShim.apply(null, arguments);
  writeMock(result, filename, qstring);
  return result;
}
