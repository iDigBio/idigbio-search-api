var request = require('request');
var _ = require("lodash");
var async = require("async");

module.exports = function(app, config) {
    var queryShim = require('../lib/query-shim.js')(app,config);
    var loadRecordsets = require("../lib/load-recordsets.js")(app,config);
    var getParam = require("../lib/get-param.js")(app,config);

    return {
        basic: function(req, res) {

            var t = req.params.t;
            var uuid = req.params.uuid;

            request.get(config.search.server + config.search.index + t + "/" + uuid,function (error, response, body) {
                // console.log(body)
                var body = JSON.parse(body);

                console.log(JSON.stringify(body,null,2));


                var indexterms = _.cloneDeep(body._source);
                delete indexterms["data"]
                var rb = {
                    "uuid": body._id,
                    "etag": body._source.data["idigbio:etag"],
                    "version": body._source.data["idigbio:version"],
                    "data": body._source.data["idigbio:data"],
                    "recordIds": body._source.data["idigbio:recordIds"],
                    "indexTerms": indexterms,
                    "attribution": {}
                };

                var rs = {
                    "uuid": body._source.recordset
                };
                if (config.recordsets[body._source.recordset]) {
                    _.defaults(rs,config.recordsets[body._source.recordset])
                    rb.attribution = rs;
                    res.json(rb);
                } else {
                    loadRecordsets(function(){
                        _.defaults(rs,config.recordsets[body._source.recordset])
                        rb.attribution = rs;
                        res.json(rb);
                    });
                }
            })
        },        
    }
}