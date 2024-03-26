
import _ from "lodash";

// import logger from "logging";
var logger=require('winston');

import {checkTerms} from "lib/indexTerms";
import {QueryParseError, TermNotFoundError} from "lib/exceptions";


function existFilter(k) {
  return {
    "exists": {
      "field": k,
    }
  };
}

function missingFilter(k) {
  return {
    "missing": {
      "field": k,
    }
  };
}

function typeWrapper(k, t, shimK) {
  var qd = _.cloneDeep(shimK);
  delete qd["type"];
  var r = {};
  r[k] = qd;
  var rv = {};
  rv[t] = r;
  return rv;
}

function rangeFilter(k, shimK) {
  return typeWrapper(k, "range", shimK);
}

function prefixFilter(k, shimK) {
  var inner = {};
  if(_.isString(shimK["value"])) {
    inner[k] = shimK["value"].toLowerCase();
  } else {
    inner[k] = shimK["value"];
  }
  return {
    "prefix": inner
  };
}

function geoBoundingBox(k, shimK) {
  //Don't allow invalid coordinates to be passed to ES
  if (shimK.top_left.lat < shimK.bottom_right.lat) {
    var temp = shimK.top_left.lat;
    shimK.top_left.lat = shimK.bottom_right.lat;
    shimK.bottom_right.lat = temp;
  }
  return typeWrapper(k, "geo_bounding_box", shimK);
}

function geoDistance(k, shimK) {
  var qd = _.cloneDeep(shimK);
  delete qd["type"];
  var r = {};
  r['distance'] = qd["distance"];
  delete qd["distance"];
  r[k] = qd;
  var rv = {};
  rv['geo_distance'] = r;
  return rv;
}

function geoShape(k, shimK) {
  return typeWrapper(k, "geo_shape", {"shape": shimK["value"] });
}

function geoPolygon(k, shimK) {
  return typeWrapper(k, "geo_polygon", {"points": shimK["value"] });
}

function termFilter(k, shimK) {
  var term = {};
  if (_.isString(shimK)) {
    term[k] = shimK.toLowerCase();
  } else {
    term[k] = shimK;
  }
  return {
    "term": term
  };
}

function termsFilter(k, shimK) {
  var or_array = [];
  shimK.forEach(function(v) {
    if(_.isString(v)) {
      or_array.push(v.toLowerCase());
    } else {
      or_array.push(v);
    }
  });
  var term = {
    "execution": "or"
  };
  term[k] = or_array;
  return {
    "terms": term
  };
}

function exactFilter(k, shimK) { // handler for "exact" toggle on portal UI.
  let term = {}
  term[k+'.exact'] = shimK['text']

  if (_.isArray(shimK['text'])) {
    term[k+'.exact'].map(str => str.toLowerCase())
    return {
      "terms": term  // use "terms" plural when passing an array of terms.
    }
  } else {
    term[k+'.exact'] = term[k+'.exact'].toLowerCase()
    return {
      "term": term
    }
  }
}

function fuzzyFilter(k, shimK) {
  let queryParam = shimK['text']
  let esQuery = {}
  let fuzziness = shimK['type'] ? "AUTO" : 0 // type is only present when fuzzy is toggled to true

  if (_.isArray(shimK['text'])) { // combine multiple terms into a bool query
    const matchQueries = queryParam.map((param) => {
      return {
        "match": {
          "scientificname": {
            "query": param.toLowerCase(),
            "operator": "and",
            "fuzziness": fuzziness
          }
        }
      }
    })
    esQuery = {
      "query": {
        "bool": {
          "should": matchQueries // should will OR the contents of the array to determine hits
        }
      }
    };
  } else { // single term
    queryParam = queryParam.toLowerCase()
    esQuery = {
      "match": {
        "scientificname": {
          "query": queryParam,
          "operator": "and",
          "fuzziness": fuzziness
        }
      }
    }
  }
  return esQuery
}

function objectType(k, shimK) {
  if(shimK["type"] === "exists") {
    return existFilter(k);
  } else if(shimK["type"] === "missing") {
    return missingFilter(k);
  } else if (shimK["type"] === "exact") {
    return exactFilter(k, shimK)
  } else if (shimK["type"] === "fuzzy") {
    return fuzzyFilter(k, shimK)
  } else if(shimK["type"] === "range") {
    return rangeFilter(k, shimK);
  } else if(shimK["type"] === "geo_bounding_box") {
    return geoBoundingBox(k, shimK);
  } else if(shimK["type"] === "geo_distance") {
    return geoDistance(k, shimK);
  } else if(shimK["type"] === "fulltext") {
    return shimK["value"].toLowerCase();
  } else if(shimK["type"] === "prefix") {
    return prefixFilter(k, shimK);
  } else if(shimK["type"] === "geo_shape") {
    return geoShape(k, shimK);
  } else if(shimK["type"] === "geo_polygon") {
    return geoPolygon(k, shimK);
  }
  logger.warn("Unknown objectType: %s, %j", k, shimK);
  return null;
}

export default function queryShim(shim, term_type) {
  if(term_type) {
    checkTerms(term_type, _.keys(shim));
  }

  const query = {
    "query": {
      "filtered": {
        "filter": {}
      }
    }
  };

  let fulltext = null;
  const and_array = [];

  _.keys(shim).forEach(function(k) {
    if(_.isString(shim[k]) || _.isBoolean(shim[k]) || _.isNumber(shim[k])) {
    if (k==='scientificname') { // TODO: Add support for other fields, store a map containing their keys
      and_array.push(fuzzyFilter(k, shim[k]))
      }
      else {and_array.push(termFilter(k, shim[k]));}
    } else if(_.isArray(shim[k])) {
      and_array.push(termsFilter(k, shim[k]));
    } else if(shim[k]["type"]) {
      const f = objectType(k, shim[k]);
      if(f) {
        if(_.isString(f)) {
          fulltext = f;
        } else {
          and_array.push(f);
        }
      } else {
        throw new QueryParseError("unable to parse type", shim[k]);
      }
    } else {
      throw new QueryParseError("unable to get type", shim[k]);
    }
  });

  if(fulltext) {
    query["query"]["filtered"]["query"] = {
      "match": {
        "_all": {
          "query": fulltext,
          "operator": "and"
        }
      }
    };
  }

  if(and_array.length > 0) {
    query["query"]["filtered"]["filter"]["and"] = and_array;
  }

  return query;
}
