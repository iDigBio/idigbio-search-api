var blanket = require("blanket")({
   /* options are passed as an argument object to the require statement */
   "pattern": ["/app/", "/lib/"],
   "data-cover-never": "node_modules"
});

var qp = require("./test-query-parser.js");
var home = require("./test-home.js");
var view = require("./test-view.js");
var search = require("./test-search.js");
var search = require("./test-search-deprecated.js");
var search = require("./test-mapping.js");
var search = require("./test-summary.js");