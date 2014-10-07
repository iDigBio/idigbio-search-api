module.exports = function(app, config) {

    //home route
    var home = require('../app/controllers/home')(app, config);
    var search = require('../app/controllers/search')(app, config);
    var mapping = require('../app/controllers/mapping')(app, config);

    app.get('/', home.index);
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
};