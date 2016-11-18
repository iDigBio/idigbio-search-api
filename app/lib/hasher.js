var crypto = require('crypto');
var _ = require('lodash');
var util = require('util');

var hash = function(hash_type, data, options) {
  var opts = _.assign({
    "sort_keys": true,
    "sort_arrays": false,
  }, options);
  var h = crypto.createHash(hash_type);

  var s = "";
  if(_.isArray(data)) {
    var sa = data.map(function(i) {
      return hash(hash_type, i, opts);
    });
    if(opts.sort_arrays) {
      sa.sort();
    }
    s = sa.join("");
  } else if(_.isString(data)) {
    s = data;
  } else if(_.isNumber(data)) {
    s = util.format("%d", data);
  } else if(_.isPlainObject(data)) {
    var ks = _.keys(data);
    if(opts.sort_keys) {
      ks.sort();
    }
    ks.forEach(function(k) {
      s += k + hash(hash_type, data[k], opts);
    });
  } else if(typeof data === "undefined") {
    s = "undefined";
  } else if(typeof data === "boolean") {
    s = data ? "true" : "false";
  } else {
    s = JSON.stringify(data);
  }

  var hv = h.update(s).digest('hex');
  return hv;
};

// module.exports = function(app,config) {
module.exports = function() {
  return {
    hash: hash
  };
};
