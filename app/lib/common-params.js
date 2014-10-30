"use strict";

var _ = require("lodash");

module.exports = function(app,config) {
    var getParam = require("./get-param.js")(app,config);

    return {
        sort: function(req) {
            return getParam(req,"sort",function(p){
                var s = {};
                s[p] = {"order":"asc"};
                return [s,{"dqs":{"order":"asc"}}];
            },[{"dqs":{"order":"asc"}}]);            
        },
        limit: function(req) {
            return getParam(req,"limit",function(p){
               return Math.min(parseInt(p),config.maxLimit);
            },100);
        },
        offset: function(req) {
            return getParam(req,"offset",function(p){
                return parseInt(p);
            },0);
        },
        query: function(n,req) {
            return  getParam(req,n,function(p){
                if (_.isString(p)) {
                    p = JSON.parse(p);
                }
                return p;
            },{});
        }
    };
};