import elasticsearch from "elasticsearch";
import _ from "lodash";

import config from "config";

export default () => {
  const esconfig = _.cloneDeep(config.elasticsearch);

  esconfig.hosts = _.shuffle(esconfig.hosts);
  return new elasticsearch.Client(esconfig);
};
