module.exports = function(app, config) {

    //home route
    var home = require('../app/controllers/home')(app, config);
    var search = require('../app/controllers/search')(app, config);
    var mapping = require('../app/controllers/mapping')(app, config);
    var view = require('../app/controllers/view')(app, config);

    app.get('/', home.index);
    app.get('/v1*', home.v1);
    app.get('/v2', home.v2);
    app.route('/idigbio/:t/_search')
        .get(home.searchProxy)
        .post(home.searchProxyPost);
    app.route('/idigbio/:t/_count')
        .get(home.searchProxy)
        .post(home.searchProxyPost);          
    app.get('/v2/view/:t/:uuid', view.basic);
    app.route('/v2/search/')
        .get(search.basic)
        .post(search.basic);
    app.route('/v2/media/')
        .get(search.media)
        .post(search.media); 
    app.route('/v2/mapping/:t/:z/:x/:y')
        .get(mapping.tiled)
        .post(mapping.tiled);               
    app.route('/v2/mapping/:t')
        .get(mapping.basic)
        .post(mapping.basic);
    app.route('/v2/mappoints/')
        .get(mapping.mapPoints)
        .post(mapping.mapPoints);        
};