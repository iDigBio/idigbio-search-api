"use strict";

var _ = require("lodash");

function QueryParseException(message,context) {
   this.error = message;
   this.context = context;
   this.name = "QueryParseException";
}

function TermNotFoundException(message,context) {
   this.error = message;
   this.context = context;
   this.name = "TermNotFoundException";
}

module.exports = function(app,config) {

    var checkTerms = require("../lib/load-index-terms.js")(app,config).checkTerms

    function existFilter(k){
        return {
            "exists": {
                "field": k,
            }
        };
    }

    function missingFilter(k){
        return {
            "missing": {
                "field": k,
            }
        };
    }

    function typeWrapper(k,t,shimK) {
        var qd = _.cloneDeep(shimK);
        delete qd["type"];
        var r = {};
        r[k] = qd;
        var rv = {};
        rv[t] = r;
        return rv;
    }

    function rangeFilter(k,shimK) {
        return typeWrapper(k,"range",shimK);
    }

    function prefixFilter(k,shimK) {
        var inner = {};
        if (_.isString(shimK["value"])) {
            inner[k] = shimK["value"].toLowerCase();
        } else {
            inner[k] = shimK["value"];
        }
        return {
            "prefix": inner
        };
    }

    function geoBoundingBox(k,shimK) {
        return typeWrapper(k,"geo_bounding_box",shimK);
    }

    function geoDistance(k,shimK){
        var qd = _.cloneDeep(shimK);
        delete qd["type"];
        var r = {};
        r['distance'] = qd["distance"];
        delete qd["distance"];
        r[k]=qd;
        var rv = {};
        rv['geo_distance'] = r;
        return rv; 
    }

    function geoShape(k,shimK){
        return typeWrapper(k,"geo_shape",{"shape": shimK });
    }

    function geoPolygon(k,shimK){
        return typeWrapper(k,"geo_polygon",{"points": shimK });
    }

    function termFilter(k,shimK) {
        var term = {};
        if (_.isString(shimK)) {
            term[k] = shimK.toLowerCase();
        } else {
            term[k] = shimK;
        }
        return {
            "term": term
        };
    }

    function termsFilter(k,shimK){
        var or_array = [];
        shimK.forEach(function(v){
            if (_.isString(v)) {
                or_array.push(v.toLowerCase());
            } else {
                or_array.push(v);
            }
        });
        var term = {
                "execution": "or"
        };
        term[k] = or_array;
        return {
            "terms": term
        };
    }

    function objectType(k, shimK) {
        if (shimK["type"] === "exists") {
            return existFilter(k);
        } else if (shimK["type"] === "missing"){
            return missingFilter(k);
        } else if (shimK["type"] === "range") {
            return rangeFilter(k,shimK);
        } else if (shimK["type"] === "geo_bounding_box") {
            return geoBoundingBox(k,shimK);
        } else if (shimK["type"] === "geo_distance"){
            return geoDistance(k,shimK);
        } else if (shimK["type"] === "fulltext") {
            return shimK["value"].toLowerCase();
        } else if (shimK["type"] === "prefix") {
            return prefixFilter(k,shimK);
        } else if (shimK["type"] === "geo_shape") {
            return geoShape(k,shimK);
        } else if (shimK["type"] === "geo_polygon") {
            return geoPolygon(k,shimK);
        } else {
            console.log(k + " " + shimK);
        }
    }

    return function(shim, term_type) {
        if (term_type) {
            var term_errors = checkTerms(term_type,_.keys(shim),true)

            if (_.keys(term_errors).length > 0) {
                throw new TermNotFoundException("Some of the query terms supplied were not found in the index", term_errors)
            }
        }

        var query = {
            "query": {
                "filtered": {
                    "filter": {}
                }
            }
        };

        var fulltext;
        var and_array = [];

        _.keys(shim).forEach(function(k) {
            if (_.isString(shim[k]) || _.isBoolean(shim[k]) || _.isNumber(shim[k])) {
                and_array.push(termFilter(k,shim[k]));
            } else if (_.isArray(shim[k])) {
                and_array.push(termsFilter(k,shim[k]));
            } else {
                if (shim[k]["type"]) {
                    var f = objectType(k,shim[k]);
                    if (f) {
                        if (_.isString(f)) {
                            fulltext = f;
                        } else {
                            and_array.push(f);
                        }
                    } else {
                        throw new QueryParseException("unable to parse type", shim[k]);
                    }
                } else{
                    throw new QueryParseException("unable to get type", shim[k]);
                }
            }
        });

        if (fulltext) {
            query["query"]["filtered"]["query"] = {
                "match": {
                    "_all": {
                        "query": fulltext,
                        "operator": "and"
                    }
                }
            };
        }

        if (and_array.length > 0) {
            query["query"]["filtered"]["filter"]["and"] = and_array;
        }

        return query;
    };
};