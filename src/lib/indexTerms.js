import _ from 'lodash';

import config from "config";
import searchShim from "searchShim";

let indexterms = {};

export function getSubKeys(mappingDict, fnPrefix) {
  var rv = {};
  var properties = mappingDict["properties"];
  _.forOwn(properties, function(prop, key) {
    let typ = prop.type;
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

export async function getMappingForType(type) {
  const indexMappings = await searchShim(config.search.index, type, "_mapping");
  // There should be just one key in here, the index, but because of
  // aliases it might not be the same one we passed in.
  if(_.size(indexMappings) !== 1) {
    throw new Error("Unexpected response from ElasticSearch");
  }
  const mapping = _.values(indexMappings)[0].mappings[type];
  return (indexterms[type] = getSubKeys(mapping, ""));
}


export function loadIndexTerms() {
  return searchShim(config.search.index, "_all", "_mapping", null)
    .then(function(mapping) {
      _.forOwn(mapping, function(index, indexName) {
        _.forOwn(index["mappings"], function(mappingDict, t) {
          indexterms[t] = getSubKeys(mappingDict, "");
        });
      });
      return indexterms;
    });
}

export function checkTerms(type, term_list, only_missing) {
  var results = {};
  var root = indexterms[type];

  term_list.forEach(function(term) {
    var termParts = term.split(".");

    // Don't try to validate terms with wildcards.
    var te  = term.indexOf("*") !== -1 ||
      termParts.every(function(termPart, i) {
        if(root[termPart]) {
          if(i === (termParts.length - 1)) {
            return true;
          }
          root = root[termPart];
          return true;
        }
        return false;
      });
    if(only_missing) {
      if(!te) {
        results[term] = te;
      }
    } else {
      results[term] = te;
    }
  });
  return results;
}
