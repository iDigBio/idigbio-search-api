module.exports = function(app,config) {
    function function (body, res) {
        var body = JSON.parse(body);

        if (body.status == 400) {
            res.status(400).json({
                "error": "Bad Request"
            })
            return
        }

        var rb = {
            "itemCount": body.hits.total,
            "items": [],
            "attribution": []
        }

        body.hits.hits.forEach(function(hit){
            var indexterms = _.cloneDeep(hit._source);
            delete indexterms["data"]
            rb.items.push({
                "uuid": hit._id,
                "etag": hit._source.data["idigbio:etag"],
                "version": hit._source.data["idigbio:version"],
                "data": hit._source.data["idigbio:data"],
                "recordIds": hit._source.data["idigbio:recordIds"],
                "indexTerms": indexterms,
            })
        });

        async.mapSeries(body.aggregations.rs.buckets,function(bucket,acb){
            var rs = {
                "uuid": bucket.key,
                "itemCount": bucket.doc_count
            };
            if (config.recordsets[bucket.key]) {
                _.defaults(rs,config.recordsets[bucket.key])
                acb(null,rs)
            } else {
                loadRecordsets(function(){
                    _.defaults(rs,config.recordsets[bucket.key])
                    acb(null,rs)
                });
            }
        },function(err,results){
            rb.attribution = results;
            res.json(rb);
        });    
    }

    return {
        basic: basic
    }
}