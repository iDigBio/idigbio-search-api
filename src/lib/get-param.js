import _ from "lodash";


export default function(req, params, munger, def) {
  if(!_.isArray(params)) {
    params = [params];
  }
  if(_.isUndefined(munger)) {
    munger = (p) => p;
  }

  params.forEach(function(param) {
    var mangle_param = null;

    // topFileds -> top_fields
    if(/.*[A-Z].*/.test(param)) {
      mangle_param = "";
      param.split(/([A-Z])/).forEach(function(part) {
        if(/[A-Z]/.test(part)) {
          mangle_param += "_" + part.toLowerCase();
        } else {
          mangle_param += part;
        }
      });
      if(mangle_param != param) {
        params.push(mangle_param);
      }
    }

    // top_fields -> topFields
    if(/.*_.*/.test(param)) {
      mangle_param = "";
      param.split("_").forEach(function(part) {
        if(mangle_param == "") {
          mangle_param += part;
        } else {
          mangle_param += part[0].toUpperCase() + part.substr(1);
        }
      });
      if(mangle_param != param) {
        params.push(mangle_param);
      }
    }
  });


  for(var i = 0; i < params.length; i++) {
    var p = params[i];
    if(req.body[p]) {
      return munger(req.body[p]);
    } else if(req.query[p]) {
      return munger(req.query[p]);
    }
  }

  // return default if we haven't returned anything else
  return def;
}
