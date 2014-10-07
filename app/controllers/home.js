module.exports = function(app, config) {
    return {
        index: function(req, res) {

            res.json({
                'test': 'test'
            });
        },
    }
}