"use strict";

var request = require('request');

module.exports = function(app,config) {
    var searchShim = require("../lib/search-shim.js")(app,config);

    return function(cb){
        searchShim(config.search.index,"recordsets","_search",{size: config.maxRecordsets},function(err,body){
            try {
                body.hits.hits.forEach(function(hit){
                    config.recordsets[hit._id] = {
                        "name": hit._source.data.collection_name,
                        "description": hit._source.data.collection_description,
                        "logo": hit._source.data.logo_url,
                        "url": hit._source.data.institution_web_address,
                        "emllink": hit._source.emllink,
                        "archivelink": hit._source.archivelink,
                        "contacts": hit._source.data.contacts,
                        "data_rights": hit._source.data.data_rights,
                        "publisher": hit._source.publisher,
                    };
                });
            } catch(e) {}

            if (cb) {
                cb();
            }
        });    
    };
};