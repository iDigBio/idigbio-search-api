"use strict";

var crypto = require('crypto');
var _ = require('lodash');
var util = require('util');

var hash = function(hash_type, data, options) {
  if(!options) {
    options = {};
  }
  _.defaults(options, {
    "sort_keys": true,
    "sort_arrays": false,
  });
  var h = crypto.createHash(hash_type);

  var s = "";
  if(_.isArray(data)) {
    var sa = [];
    data.forEach(function(i) {
      sa.push(hash(hash_type, i, options));
    });
    if(options.sort_arrays) {
      sa.sort();
    }
    s = sa.join("");
  } else if(_.isString(data)) {
    s = _.cloneDeep(data);
  } else if(_.isNumber(data)) {
    s = util.format("%d", data);
  } else if(_.isPlainObject(data)) {
    var ks = _.keys(data);
    if(options.sort_keys) {
      ks.sort();
    }
    ks.forEach(function(k) {
      s += k + hash(hash_type, data[k], options);
    });
  } else if(typeof data === "undefined") {
    s = "undefined";
  } else if(typeof data === "boolean") {
    if(data) {
      s = "true";
    } else {
      s = "false";
    }
  } else {
    console.log(typeof data);
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
