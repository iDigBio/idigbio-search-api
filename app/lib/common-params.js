"use strict";

var _ = require("lodash");

module.exports = function(app,config) {
    var getParam = require("./get-param.js")(app,config);

    return {
        sort: function(req) {
            return getParam(req,"sort",function(p){
                var order=[],param,s;
                try {
                    param = JSON.parse(p);
                } catch(e) {
                    param = p;
                }
                if(_.isString(param)){
                    s={};
                    s[param]={"order":"asc"};
                    order.push(s); 
                }else if(_.isArray(param)){
                    param.forEach(function(item){
                        s={};
                        _.forOwn(item,function(v,k){
                            s[k]={"order": v};
                            order.push(s);
                        });
                    });
                }
                order.push({"dqs":{"order":"desc"}});
                return order;
            },[{"dqs":{"order":"desc"}}]);
        },
        limit: function(req) {
            return getParam(req,"limit",function(p){
               return Math.min(parseInt(p),config.maxLimit);
            },config.defaultLimit);
        },
        offset: function(req) {
            return getParam(req,"offset",function(p){
                return parseInt(p);
            },0);
        },
        query: function(n,req) {
            return  getParam(req,n,function(p){
                try {
                    if (_.isString(p)) {
                        p = JSON.parse(p);
                    }
                    return p;
                } catch (e) {
                    return {}
                }
            },{});
        },
        fields: function(req) {
            return getParam(req,"fields",function(p){
                try {
                    if (_.isString(p)) {
                        p = JSON.parse(p);
                    }
                    return p;
                } catch (e) {
                    return undefined;
                }
            },undefined);
        }
    };
};