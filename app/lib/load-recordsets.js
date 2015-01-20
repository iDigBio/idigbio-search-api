"use strict";

var request = require('request');

module.exports = function(app,config) {
    return function(cb){
        request.post({
            url: config.search.server + config.search.index + "recordsets/_search",
            body: JSON.stringify({size: config.maxRecordsets})
        }, function (error, response, body) {
            body = JSON.parse(body);

            body.hits.hits.forEach(function(hit){
                config.recordsets[hit._id] = {
                    "name": hit._source.data["idigbio:data"].collection_name,
                    "description": hit._source.data["idigbio:data"].collection_description,
                    "logo": hit._source.data["idigbio:data"].logo_url,
                    "url": hit._source.data["idigbio:data"].institution_web_address,
                    "contacts": hit._source.data["idigbio:data"].contacts,
                };
            });

            if (cb) {
                cb();
            }
        });    
    };
};