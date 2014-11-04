module.exports = function(app, config) {

    //home route
    var home = require('../app/controllers/home')(app, config);
    var search = require('../app/controllers/search')(app, config);
    var mapping = require('../app/controllers/mapping')(app, config);
    var view = require('../app/controllers/view')(app, config);

    // app.use(function(req, res, next){
    //     console.log(req.originalUrl);
    //     console.log(req.body);
    //     console.log(req.params);
    //     next();
    // })

    app.route('/')
        .get(home.index);
    app.route('/v1*')
        .get(home.v1);
    app.route('/v2')
        .get(home.v2);
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
    // app.route('/v2/mapping/:t')
    //     .get(mapping.basic)
    //     .post(mapping.basic);
    app.route('/v2/mapping/')
        .get(mapping.createMap)
        .post(mapping.createMap);
    app.route('/v2/mapping/:s')
        .get(mapping.getMap)        
    app.route('/v2/mapping/:s/points')
        .get(mapping.mapPoints)
    app.route('/v2/mapping/:s/:z/:x/:y.:t')
        .get(mapping.getMapTile)

    app.use(function(req, res, next){
        res.status(404).json({"error": "Not Found"})
    }); 
};