
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
    } else {
      throw new ParameterParseError("Unable to parse", "sort");
    }
  }, defsort);
}

export function limit(req) {
  return getParam(req, "limit", function(p) {
    const pp = parseInt(p, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", "limit");
    } else {
      return Math.min(pp, config.maxLimit);
    }
  }, config.defaultLimit);
}

export function offset(req) {
  return getParam(req, "offset", function(p) {
    const pp = parseInt(p, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", "offset");
    } else {
      return pp;
    }
  }, 0);
}

export function top_count(req) {
  return getParam(req, "count", function(p) {
    const pp = parseInt(p, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", "count");
    } else {
      return Math.min(pp, config.maxLimit);
    }
  }, 10);
}

export function threshold(req, def) {
  return getParam(req, "threshold", function(p) {
    const pp = parseInt(p, 10);
    if(isNaN(pp)) {
      throw new ParameterParseError("numeric parameter expected, parsing did not return a number", "threshold");
    }
    return pp;
  }, def);
}


export function query(n, req) {
  return getParam(req, n, function(p) {
    try {
      if(_.isString(p)) {
        p = JSON.parse(p);
      }
      return p;
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
      const term_errors = checkTerms(term_type, p, true);
      if(_.keys(term_errors).length > 0) {
        throw new TermNotFoundError("Some of the top_fields terms supplied were not found in the index", term_errors);
      }
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
      const term_errors = checkTerms(term_type, p, true);
      if(_.keys(term_errors).length > 0) {
        throw new TermNotFoundError(
          "Some of the fields terms supplied were not found in the index",
          _.keys(term_errors));
      }
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
      const term_errors = checkTerms(term_type, p, true);
      if(_.keys(term_errors).length > 0) {
        throw new TermNotFoundError("Some of the fields_exclude terms supplied were not found in the index", term_errors);
      }
    }

    return p;
  });
}

export function noattr(req) {
  return getParam(req, "no_attribution", function(arg) {
    if(_.isBoolean(arg)) return arg;
    arg = arg.toLowerCase();
    return arg === "true" || arg === "yes" || arg === "1"
  }, false);
}
