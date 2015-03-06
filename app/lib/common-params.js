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
                        if(_.isString(item)){
                            s[item]={"order":"asc"};
                        } else {
                            _.forOwn(item,function(v,k){
                                if(_.isString(v)) {
                                    s[k] = {"order": v};
                                } else {
                                    s[k] = v;
                                }
                            });
                        }
                        order.push(s);
                    });
                }
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
        top_count: function(req) {
            return getParam(req,"count",function(p){
               return Math.min(parseInt(p),config.maxLimit);
            },10);
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
        top_fields: function(req) {
            return getParam(req,"top_fields",function(p){
                try {
                    if (_.isString(p)) {
                        p = JSON.parse(p);
                    }
                    return p;
                } catch (e) {
                    return undefined;
                }
            },undefined);
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
        },
        fields_exclude: function(req) {
            return getParam(req,"fields_exclude",function(p){
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