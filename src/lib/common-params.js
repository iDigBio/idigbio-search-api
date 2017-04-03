
import _ from "lodash";

import config from "config";
import getParam from "lib/get-param";
import {checkTerms} from "lib/indexTerms";
import {ParameterParseError, TermNotFoundError} from "lib/exceptions";


export function sort(req) {
  const defsort = [{"dqs": {"order": "desc"}}];
  return getParam(req, "sort", function(p) {
    let param = p;
    try {
      param = JSON.parse(p);
    } catch (e) {}

    if(_.isString(param)) {
      const s = {};
      s[param] = {"order": "asc"};
      return [s];
    } else if(_.isArray(param)) {
      return _.map(param, function(item) {
        const s = {};
        if(_.isString(item)) {
          s[item] = {"order": "asc"};
        } else {
          _.forOwn(item, function(v, k) {
            if(_.isString(v)) {
              s[k] = {"order": v};
            } else {
              s[k] = v;
            }
          });
        }
        return s;
      });
    }
    throw new ParameterParseError("Unable to parse", "sort");
  }, defsort);
}

export function int(req, paramName, dflt) {
  return getParam(req, paramName, function(paramVal) {
    const pp = parseInt(paramVal, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", paramName);
    }
    return pp;
  }, dflt);
}

export function float(req, paramName, dflt) {
  return getParam(req, paramName, function(paramVal) {
    const pp = parseFloat(paramVal, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", paramName);
    }
    return pp;
  }, dflt);
}

export function bool(req, paramName, dflt) {
  return getParam(req, paramName, function(arg) {
    if(_.isBoolean(arg)) { return arg; }
    arg = arg.toLowerCase();
    return arg === "true" || arg === "yes" || arg === "1";
  }, dflt);
}

export function limit(req) {
  return Math.min(config.maxLimit, int(req, "limit", config.defaultLimit));
}

export function offset(req) {
  return int(req, "offset", 0);
}

export function lat(req) {
  return float(req, "lat", 0);
}
export function lon(req) {
  let pp = float(req, "lon", 0);
  while(pp > 180) { pp -= 360; }
  while(pp < -180) { pp += 360; }
  return pp;
}

export function zoom(req) { return int(req, "zoom", 0); }

export function top_count(req, numFields) {
  if(typeof(numFields) === "undefined") {
    numFields = 1;
  }
  let maxLimit = Math.min(Math.pow(10, (4 - numFields)), 1) * config.maxLimit;
  return Math.min(int(req, "count", 10), maxLimit);
}

export function threshold(req, def) {
  return int(req, "threshold", def);
}


export function query(n, req) {
  return getParam(req, n, function(p) {
    try {
      return _.isString(p) ? JSON.parse(p) : p;
    } catch (e) {
      throw new ParameterParseError("unable to parse parameter", n);
    }
  }, {});
}

export function top_fields(req, term_type) {
  return getParam(req, "top_fields", function(p) {
    try {
      if(_.isString(p) && (p[0] === "\"" || p[0] === "["  || p[0] === "{")) {
        p = JSON.parse(p);
      }
      // Special case for single value as string to make R easier to work with
      if(_.isString(p)) {
        p = [p];
      }
    } catch (e) {
      throw new ParameterParseError("unable to parse parameter", "top_fields");
    }

    if(term_type) {
      checkTerms(term_type, p);
    }

    return p;
  });
}


export function fields(req, term_type) {
  return getParam(req, "fields", function(p) {
    try {
      if(_.isString(p) && (p[0] === "\"" || p[0] === "[" || p[0] === "{")) {
        p = JSON.parse(p);
      }
      // Special case for single value as string to make R easier to work with
      if(_.isString(p)) {
        p = [p];
      }

    } catch (e) {
      throw new ParameterParseError("Unable to parse parameter", "fields");
    }

    if(term_type) {
      checkTerms(term_type, p);
    }

    return p;
  });
}

export function fields_exclude(req, term_type) {
  return getParam(req, "fields_exclude", function(p) {
    try {
      if(_.isString(p) && (p[0] === "\"" || p[0] === "["  || p[0] === "{")) {
        p = JSON.parse(p);
      }
      // Special case for single value as string to make R easier to work with
      if(_.isString(p)) {
        p = [p];
      }
    } catch (e) {
      throw new ParameterParseError("unable to parse parameter", "fields_exclude");
    }

    if(term_type) {
      checkTerms(term_type, p);
    }

    return p;
  });
}

export function noattr(req) {
  return bool(req, "no_attribution", false);
}
