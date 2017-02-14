import _ from "lodash";


export default function(req, params, munger, def) {
  if(!_.isArray(params)) {
    params = [params];
  }
  munger = munger || _.identity;
  const possibleNames = function*() {
    for(const param of params) {
      yield param;
      // topFields -> top_fields
      if(/.*[A-Z].*/.test(param)) {
        yield _.snakeCase(param);
      }
      // top_fields -> topFields
      if(/.*_.*/.test(param)) {
        yield _.camelCase(param);
      }
    }
  };

  for(const p of possibleNames()) {
    if(!_.isUndefined(req.body[p])) {
      return munger(req.body[p]);
    }
    if(!_.isUndefined(req.query[p])) {
      return munger(req.query[p]);
    }
  }

  // return default if we haven't returned anything else
  return def;
}
