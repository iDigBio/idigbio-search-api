var request = require('request');

module.exports = function(app, config) {
    return {
        index: function(req, res) {
            res.json({
                'v1': req.protocol + '://' + req.get("host") + '/v1',
                'v2': req.protocol + '://' + req.get("host") + '/v2',
            });
        },
        v2: function(req, res) {
            res.json({
                'search': req.protocol + '://' + req.get("host") + '/v2/search',
                'mapping': req.protocol + '://' + req.get("host") + '/v2/mapping',
                'view': req.protocol + '://' + req.get("host") + '/v2/view',
            });
        },
        v1: function(req, res) {
            //console.log("http://api.idigbio.org" + req.originalUrl)
            request.get("http://api.idigbio.org" + req.originalUrl,function(error, response, body) {
                res.json(JSON.parse(body))
            });
        },
        searchProxy: function(req, res) {
            //console.log(config.search.server + req.originalUrl)
            request.get(config.search.server + req.originalUrl,function(error, response, body) {
                res.json(JSON.parse(body))
            });
        },
        searchProxyPost: function(req, res) {
            // Fix broken decode on missing mime type
            if (Object.keys(req.body).length == 1 && req.body[Object.keys(req.body)[0]] == '' ){
                try {
                    req.body = JSON.parse(Object.keys(req.body)[0])
                } catch(e) {
                    res.status(400).json({"error": "Bad Request"});
                    return
                }
            }

            request.post({
                url: config.search.server + req.originalUrl,
                body: JSON.stringify(req.body)
            },function(error, response, body) {
                res.json(JSON.parse(body))
            });
        },                    
    }
}