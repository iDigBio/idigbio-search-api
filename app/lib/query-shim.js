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

module.exports = function(app,config) {
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
        var term, qd, r;

        _.keys(shim).forEach(function(k) {
            if (_.isString(shim[k]) || _.isBoolean(shim[k])) {
                term = {};
                term[k] = shim[k];
                and_array.push({
                    "term": term
                });
            } else if (_.isArray(shim[k])) {
                var or_array = [];
                shim[k].forEach(function(v){
                    or_array.push(v);
                });
                term = {
                        "execution": "or"
                };
                term[k] = or_array;
                and_array.push({
                    "terms": term
                });
            } else {
                if (shim[k]["type"] === "exists") {
                    and_array.push({
                        "exists": {
                            "field": k,
                        }
                    });
                } else if (shim[k]["type"] === "missing"){
                    and_array.push({
                        "missing": {
                            "field": k,
                        }
                    });
                } else if (shim[k]["type"] === "range") {
                    qd = _.cloneDeep(shim[k]);
                    delete qd["type"];
                    r = {};
                    r[k] = qd;
                    and_array.push({
                        "range": r
                    });
                } else if (shim[k]["type"] === "geo_bounding_box") {
                    qd = _.cloneDeep(shim[k]);
                    delete qd["type"];
                    r = {};
                    r[k] = qd;                    
                    and_array.push({
                        "geo_bounding_box": r
                    });
                } else if (shim[k]["type"] === "fulltext") {
                    fulltext = shim[k]["value"];
                } else {
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