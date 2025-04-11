import _ from "lodash";

import config from "config";
import searchShim from "searchShim";

import {InvalidTypeError, TermNotFoundError} from "lib/exceptions";
export const indexterms = {};

export function clear() {
  _(indexterms)
    .keys()
    .forEach(function(k) {
    delete indexterms[k];
  });
}

export function getSubKeys(mappingDict, fnPrefix) {
  var rv = {};
  var properties = mappingDict["properties"];
  _.forOwn(properties, function(prop, key) {
    const typ = prop.type;
    if(typ) {
      // Can't decide if notifying of analyzer status is a good thing or not.
      // if (prop.analyzer && prop.analyzer === "keyword") {
      //     typ = "keyword";
      // }
      rv[key] = {
        type: typ,
        fieldName: fnPrefix + key
      };
    } else if(prop.properties) {
      rv[key] = getSubKeys(prop, fnPrefix + key + ".");
    }
  });

  return rv;
}

export function getMappingForType(type) {
  if(type === "media") {
    type = "mediarecords";
  }
  const res = indexterms[type];
  if(!res) {
    throw new InvalidTypeError(type);
  }
  return res;
}


export async function loadIndexTerms(type) {
  const indexMappings = await searchShim(config.search.index, type || "_all", "_mapping");
  // There should be just one key in here, the index, but because of
  // aliases it might not be the same one we passed in.
  if(_.size(indexMappings) !== 1) {
    throw new Error("Unexpected response from ElasticSearch");
  }
  const mappings = _.values(indexMappings)[0].mappings;
  _.forOwn(mappings, function(mappingDict, t) {
    indexterms[t] = getSubKeys(mappingDict, "");
  });
  return indexterms;
}


export function checkTerms(type, termList) {
  const root = getMappingForType(type);

  const missingTerms = _(termList)
        .filter((t) => !_.includes(t, "*"))
        .filter((t) => _.isEmpty(_.get(root, t)))
        .without("_id")
        .value();
  if(missingTerms.length) {
    throw new TermNotFoundError(`Terms not found in index for type ${type}`, missingTerms);
  }
}
