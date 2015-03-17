"use strict";

/*

    PYTHON IMPLEMENTATION

    query = {
        "query": {
            "filtered": {
                "filter": {}
            }
        }
    }

    fulltext = None
    and_array = []
    for k in shim:
        if isinstance(shim[k],str) or isinstance(shim[k],unicode) or isinstance(shim[k],bool):
            term = {};
            term[k] = shim[k];
            and_array.append({
                "term": term
            });
        elif isinstance(shim[k],list):
            or_array = []
            for v in shim[k]:
                or_array.append(v)
            term = {
                    "execution": "or"
            }
            term[k] = or_array
            and_array.append({
                "terms": term
            })
        else:
            try:
                if shim[k]["type"] == "exists":
                    and_array.append({
                        "exists": {
                            "field": k,
                        }
                    })
                elif shim[k]["type"] == "missing":
                    and_array.append({
                        "missing": {
                            "field": k,
                        }
                    })
                elif shim[k]["type"] == "range":
                    qd = copy.deepcopy(shim[k])
                    del qd["type"]
                    and_array.append({
                        "range": {
                            k: qd,
                        }
                    })
                elif shim[k]["type"] == "geo_bounding_box":
                    qd = copy.deepcopy(shim[k])
                    del qd["type"]
                    and_array.append({
                        "geo_bounding_box": {
                            k: qd,
                        }
                    })
                elif shim[k]["type"] == "fulltext":
                    fulltext = shim[k]["value"]
                else:
                    logger.error(k + " " + shim[k])
            except:
                logger.error(traceback.format_exc())
                logger.error(k + " " + shim[k])

    if fulltext is not None:
        query["query"]["filtered"]["query"] = {
            "match": {
                "_all": {
                    "query": fulltext,
                    "operator": "and"
                }
            }
        }

    if len(and_array) > 0:
        query["query"]["filtered"]["filter"]["and"] = and_array

    return query

*/

var _ = require("lodash");

//module.exports = function(app,config) {
module.exports = function() {

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
        if (_.isString(shimK)) {
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
        } else {
            console.log(k + " " + shimK);
        }
    }

    return function(shim) {
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
                    if (_.isString(f)) {
                        fulltext = f;
                    } else {
                        and_array.push(f);
                    }
                } else{
                    console.log(k + " " + shim[k]);
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