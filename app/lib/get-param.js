"use strict";

//module.exports = function(app,config) {
module.exports = function() {
    return function(req,param,munger,def) {
        if (req.body[param]) {
            return munger(req.body[param]);
        } else if (req.query[param]){
            return munger(req.query[param]);
        } else {
            return def;
        }
    };
};