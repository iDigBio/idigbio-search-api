"use strict";

//module.exports = function(app,config) {
module.exports = function() {
    return function(req,param,munger,def) {
        var params = [param];
        var mangle_param;

        // topFileds -> top_fields
        if (/.*[A-Z].*/.test(param)) {
            mangle_param = "";
            param.split(/([A-Z])/).forEach(function(part){
                if (/[A-Z]/.test(part)) {
                    mangle_param += "_" + part.toLowerCase();
                } else {
                    mangle_param += part;
                }
            })
            if (mangle_param != param) {
                params.push(mangle_param);
            }
        }

        // top_fields -> topFields
        if (/.*_.*/.test(param)) {
            mangle_param = "";
            param.split("_").forEach(function(part){
                if (mangle_param == "") {
                    mangle_param += part;
                } else {
                    mangle_param += part[0].toUpperCase() + part.substr(1);
                }
            });
            if (mangle_param != param) {
                params.push(mangle_param);
            }
        }

        for (var i in params) {
            var p = params[i];
            if (req.body[p]) {
                return munger(req.body[p]);
            } else if (req.query[p]){
                return munger(req.query[p]);
            }
        }

        // return default if we haven't returned anything else
        return def;
    };
};