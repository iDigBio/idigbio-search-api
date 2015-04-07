module.exports = function(app,config) {
    var request = require("request");

    return function(index, type, op, query, cb){
        if (config.search.useEsClient) {

        } else {
            request.post({
                url: config.search.server + index + type + "/" + op,
                body: JSON.stringify(query)
            },function (error, response, body) {
                cb(JSON.parse(body));
            });            
        }
    }
}