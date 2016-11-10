"use strict";

var _ = require("lodash"),
    fs = require("fs");

module.exports = function(app, config) {
  var hasher = require("../lib/hasher")(app, config);

  var writeMock = function(h, body) {
    var b = _.cloneDeep(body),
        filename = "test/mock/" + h + ".json";
    delete b.took;
    fs.writeFile(filename, JSON.stringify(b, null, 2), function(err) {
      if(err) {
        console.error("Failed writing mock to", filename);
      }
    });
  };
  var readMock = function(index, type, op, query, cb, statsInfo) {
    var h = hasher.hash("sha256", [index, type, op, query]);
    fs.readFile("test/mock/" + h + ".json", function(err, data) {
      if(err) {
        return cb("No json mock for " + h, null);
      }
      return cb(null, data);
    });
  };

  return {readMock, writeMock};
};
