"use strict";

var Promise = require('bluebird');

module.exports = function(wrappedFn, name) {
  name = name || wrappedFn.name;
  return function() {
    var t1 = new Date();
    console.log("Starting", name);
    return Promise.resolve(wrappedFn.apply(this, arguments))
      .then(function(arg) {
        var t2 = new Date();
        console.log("Finished", name, "in", t2 - t1);
        return arg;
      });
  };
};
