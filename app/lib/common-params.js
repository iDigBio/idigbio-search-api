"use strict";

var _ = require("lodash");


function ParameterParseException(message, context) {
  this.error = message;
  this.param = context;
  this.name = "ParameterParseException";
}

function TermNotFoundException(message, context) {
  this.error = message;
  this.context = context;
  this.name = "TermNotFoundException";
}

module.exports = function(app, config) {
  var getParam = require("./get-param.js")(app, config);
  var checkTerms = require("../lib/load-index-terms.js")(app, config).checkTerms;

  return {
    sort: function(req) {
      return getParam(req, "sort", function(p) {
        var order = [], param, s;
        try {
          param = JSON.parse(p);
        } catch (e) {
          param = p;
        }
        if(_.isString(param)) {
          s = {};
          s[param] = {"order": "asc"};
          order.push(s);
        } else if(_.isArray(param)) {
          param.forEach(function(item) {
            s = {};
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
            order.push(s);
          });
        }
        return order;
      }, [{"dqs": {"order": "desc"}}]);
    },
    limit: function(req) {
      return getParam(req, "limit", function(p) {
        var pp = parseInt(p);
        if(isNaN(pp)) {
          throw new ParameterParseException("numeric paramter expected, parsing did not return a number", "limit");
        } else {
          return Math.min(pp, config.maxLimit);
        }
      }, config.defaultLimit);
    },
    offset: function(req) {
      return getParam(req, "offset", function(p) {
        var pp = parseInt(p);
        if(isNaN(pp)) {
          throw new ParameterParseException("numeric paramter expected, parsing did not return a number", "limit");
        } else {
          return pp;
        }
      }, 0);
    },
    top_count: function(req) {
      return getParam(req, "count", function(p) {
        var pp = parseInt(p);
        if(isNaN(pp)) {
          throw new ParameterParseException("numeric paramter expected, parsing did not return a number", "limit");
        } else {
          return Math.min(pp, config.maxLimit);
        }
      }, 10);
    },
    query: function(n, req) {
      return  getParam(req, n, function(p) {
        try {
          if(_.isString(p)) {
            p = JSON.parse(p);
          }
          return p;
        } catch (e) {
          throw new ParameterParseException("unable to parse parameter", n);
        }
      }, {});
    },
    top_fields: function(req, term_type) {
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
          throw new ParameterParseException("unable to parse parameter", "top_fields");
        }

        if(term_type) {
          var term_errors = checkTerms(term_type, p, true);

          if(_.keys(term_errors).length > 0) {
            throw new TermNotFoundException("Some of the top_fields terms supplied were not found in the index", term_errors);
          }
        }

        return p;
      }, undefined);
    },
    fields: function(req, term_type) {
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
          throw new ParameterParseException("unable to parse parameter", "fields");
        }

        if(term_type) {
          var term_errors = checkTerms(term_type, p, true);

          if(_.keys(term_errors).length > 0) {
            throw new TermNotFoundException("Some of the fields terms supplied were not found in the index", term_errors);
          }
        }

        return p;
      }, undefined);
    },
    fields_exclude: function(req, term_type) {
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
          throw new ParameterParseException("unable to parse parameter", "fields_exclude");
        }

        if(term_type) {
          var term_errors = checkTerms(term_type, p, true);

          if(_.keys(term_errors).length > 0) {
            throw new TermNotFoundException("Some of the fields_exclude terms supplied were not found in the index", term_errors);
          }
        }

        return p;
      }, undefined);
    },
    noattr: function(req) {
      return getParam(req, "no_attribution", function(p) {
        return p;
      }, false);
    }
  };
};
