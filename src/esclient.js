import bluebird from "bluebird";
import elasticsearch from "elasticsearch";
import _ from "lodash";

import config from "config";
import logger from "./logging";

let client;
export default (client = _.memoize(() => {
  const esconfig = _.cloneDeep(config.elasticsearch);
//  esconfig.defer = () => bluebird.defer();
  esconfig.hosts = _.shuffle(esconfig.hosts);
  return new elasticsearch.Client(esconfig);
}));

export async function validateConfigAsync() {
  let allIndicesExist = false;
  await Promise.all([config.search.index, config.search.statsIndex].map((indexName) =>
    client().indices.get({index: indexName})
      .then(() => {
        logger.info("esclient:validateConfig: Confirmed ES index '%s' exists", indexName);
        return Promise.resolve();
      })
      .catch(error => {
        logger.error("esclient:validateConfig: Failed to look up ES index '%s' (might not exist)", indexName);
        throw new Error(error);
      })
  ))
  .then(() => { allIndicesExist = true; });
  // At this point, should only be true.
  // Promise.all() above throws if not all indices exist.
  return allIndicesExist;
}
