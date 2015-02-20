"use strict";

var should = require('chai').should();
var request = require('supertest');

var app = require('../app.js');
var config = app.config

describe('Mapping', function(){
  this.timeout(30000)
  describe('map creation', function(){
    it('should return urls for tiles and points', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error, response) {
          if(error) {
            done(error);
          } else {          
            response.body.should.have.property("shortCode");
            response.body.should.have.property("tiles");
            response.body.should.have.property("geojson");
            response.body.should.have.property("points");
            response.body.should.have.property("attribution");
            response.body.should.have.property("mapDefinition");
            done();
          }
        })
    })
    it('should return the same urls if called twice', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error2, response2) {
                if(error2) {
                  done(error2);
                } else {          
                  response2.body.tiles.should.equal(response1.body.tiles);
                  response2.body.geojson.should.equal(response1.body.geojson);
                  response2.body.points.should.equal(response1.body.points);
                  done();
                }
              })
          }
        })
    })
    it('should return the different urls if called twice with different queries', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {       
            var q2 = {"scientificname": "nullius nullium"}   
            request(app.server)
              .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q2)))
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error2, response2) {
                if(error2) {
                  done(error2);
                } else {          
                  response2.body.tiles.should.not.equal(response1.body.tiles);
                  response2.body.geojson.should.not.equal(response1.body.geojson);
                  response2.body.points.should.not.equal(response1.body.points);
                  done();
                }
              })
          }
        })
    })
    it('should return the different urls if called twice with different styles', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {       
            var non_default_style = {
                fill: 'rgba(255,0,0,.4)',
                stroke: 'rgba(255,0,0,.6)'                
            };
            request(app.server)
              .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)) + "&style=" + encodeURIComponent(JSON.stringify(non_default_style)))
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error2, response2) {
                if(error2) {
                  done(error2);
                } else {          
                  response2.body.tiles.should.not.equal(response1.body.tiles);
                  response2.body.geojson.should.not.equal(response1.body.geojson);
                  response2.body.points.should.not.equal(response1.body.points);
                  done();
                }
              })
          }
        })
    })
    it('should return the different urls if called twice with different types', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {       
            request(app.server)
              .get("/v2/mapping/?type=points&rq=" + encodeURIComponent(JSON.stringify(q)))
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error2, response2) {
                if(error2) {
                  done(error2);
                } else {          
                  response2.body.tiles.should.not.equal(response1.body.tiles);
                  response2.body.geojson.should.not.equal(response1.body.geojson);
                  response2.body.points.should.not.equal(response1.body.points);
                  done();
                }
              })
          }
        })
    })
  });  
  describe('map definition retrieval', function(){
    it('should return the definition back when the short code url is called alone', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode)
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error2, response2) {
                if(error2) {
                  done(error2);
                } else {          
                  response2.body.tiles.should.equal(response1.body.tiles);
                  response2.body.geojson.should.equal(response1.body.geojson);
                  response2.body.points.should.equal(response1.body.points);
                  done();
                }
              })
          }
        })
    });
  });
  describe('png map tiles', function(){
    it('should return an png image for geohash maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.png")
              .expect('Content-Type', /png/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });
    it('should return an png image for point maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=points&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.png")
              .expect('Content-Type', /png/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    }); 
    it('should return an png image for auto maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=auto&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.png")
              .expect('Content-Type', /png/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });    
  });
  describe('geojson map tiles', function(){
    it('should return geojson for geohash maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.json")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.itemCount.should.not.equal(0);
                  response.body.type.should.equal("FeatureCollection");
                  response.body.features.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });
    it('should return geojson for point maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=points&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.json")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.itemCount.should.not.equal(0);
                  response.body.type.should.equal("FeatureCollection");
                  response.body.features.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });    
  });
  describe('utf8 grid map tiles', function(){
    it('should return utf8 grid for geohash maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.grid.json")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.should.have.property("grid");
                  response.body.should.have.property("data");
                  response.body.should.have.property("keys");
                  done();
                }
              })
          }
        })
    });
    it('should return utf8 grid for point maps', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=points&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.grid.json")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.should.have.property("grid");
                  response.body.should.have.property("data");
                  response.body.should.have.property("keys");
                  done();
                }
              })
          }
        })
    });    
  });
  describe('retrieve map points', function(){
    it('should return data under normal conditions', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/points?lat=35&lon=-106&zoom=1")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.itemCount.should.not.equal(0);
                  response.body.items.length.should.not.equal(0);
                  response.body.should.have.property("bbox");
                  done();
                }
              })
          }
        })
    });
    it('should return data for longitudes less than -180', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/points?lat=35&lon=-466&zoom=1")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.itemCount.should.not.equal(0);
                  response.body.items.length.should.not.equal(0);
                  response.body.should.have.property("bbox");
                  done();
                }
              })
          }
        })
    });
    it('should return data for longitudes greater than 180', function(done){
      var q = {"scientificname": "puma concolor"}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/points?lat=35&lon=254&zoom=1")
              .expect('Content-Type', /json/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.itemCount.should.not.equal(0);
                  response.body.items.length.should.not.equal(0);
                  response.body.should.have.property("bbox");
                  done();
                }
              })
          }
        })
    });
  });
  // These are more of "dont crash" tests for coverage, rather than corectness assements. Testing the PNGs for corectness is hard.
  describe('complex styles', function(){        
    it('should support complex styles for geohash doc counts', function(done){
      var q = {"genus": "carex", "institutioncode":["uf","flas","flmnh"]}
      var geohash_style = {"fill":"rgba(255,0,0,.4)","stroke":"rgba(255,0,0,.6)","doc_count":[{"fill":"rgba(255,0,0,.4)","stroke":"rgba(255,0,0,.6)"},{"fill":"rgba(0,255,0,.4)","stroke":"rgba(0,255,0,.6)"},{"fill":"rgba(0,0,255,.4)","stroke":"rgba(0,0,255,.6)"}]}
      request(app.server)
        .get("/v2/mapping/?type=geohash&rq=" + encodeURIComponent(JSON.stringify(q)) + "&style=" + encodeURIComponent(JSON.stringify(geohash_style)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.png")
              .expect('Content-Type', /png/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });
    it('should support complex styles for point properties', function(done){
      var q = {"genus": "carex", "institutioncode":["uf","flas","flmnh"]}
      var property_style = {"fill":"rgba(255,0,0,.4)","stroke":"rgba(255,0,0,.6)","institutioncode":{"flas":{"fill":"rgba(255,0,0,.4)","stroke":"rgba(255,0,0,.6)"},"uf":{"fill":"rgba(0,255,0,.4)","stroke":"rgba(0,255,0,.6)"},"flmnh":{"fill":"rgba(0,0,255,.4)","stroke":"rgba(0,0,255,.6)"}}}
      request(app.server)
        .get("/v2/mapping/?type=points&rq=" + encodeURIComponent(JSON.stringify(q)) + "&style=" + encodeURIComponent(JSON.stringify(property_style)))
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(error1, response1) {
          if(error1) {
            done(error1);
          } else {          
            request(app.server)
              .get("/v2/mapping/" + response1.body.shortCode + "/1/0/0.png")
              .expect('Content-Type', /png/)
              .expect(200)
              .end(function(error, response) {
                if(error) {
                  done(error);
                } else {
                  response.body.length.should.not.equal(0);
                  done();
                }
              })
          }
        })
    });  

  })
  // describe('basic get points', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {          
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/points/?limit=10&rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should obey maxLimit', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/points/?limit=10000&rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.features.length.should.be.below(config.maxLimit+1);
  //           done();
  //         }
  //       })
  //   })          
  // })
  // describe('basic post points', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .post("/v2/mapping/points/")
  //       .send({
  //           rq: q,
  //       })
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .post("/v2/mapping/points/")
  //       .send({
  //           rq: q,
  //           limit: 10,
  //       })
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should obey maxLimit', function(done){
  //     var q = {}
  //     request(app.server)
  //       .post("/v2/mapping/points/")
  //       .send({
  //           rq: q,
  //           limit: 10000,
  //       })
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.features.length.should.be.below(config.maxLimit+1);
  //           done();
  //         }
  //       })
  //   }) 
  // })
  // describe('basic get geohash', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/points/?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })          
  // })
  // describe('basic post geohash', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .post("/v2/mapping/geohash/")
  //       .send({
  //           rq: q,
  //       })
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .post("/v2/mapping/geohash/")
  //       .send({
  //           rq: q,
  //       })
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })
  // })
  // describe('tile get points', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mapping/points/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/points/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //             done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })          
  // })
  // describe('tile get geohash', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mapping/geohash/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/geohash/1/0/0?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.type.should.equal("FeatureCollection");
  //           response.body.features.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })          
  // })
  // describe('tile get png', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mapping/tile/1/0/0.png?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /png/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mapping/tile/1/0/0.png?rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /png/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })          
  // })
  // describe('get mappoints', function(){
  //   it('should return an empty search for {"scientificname": "puma concolor"}', function(done){
  //     var q = {"scientificname": "puma concolor"}
  //     request(app.server)
  //       .get("/v2/mappoints/?lat=0&lon=0&zoom=1&rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.equal(0);
  //           response.body.items.length.should.equal(0);
  //           done();
  //         }
  //       })
  //   })
  //   it('should not return an empty search for {}', function(done){
  //     var q = {}
  //     request(app.server)
  //       .get("/v2/mappoints/?lat=0&lon=0&zoom=1&rq=" + encodeURIComponent(JSON.stringify(q)))
  //       .expect('Content-Type', /json/)
  //       .expect(200)
  //       .end(function(error, response) {
  //         if(error) {
  //           done(error);
  //         } else {
  //           response.body.itemCount.should.not.equal(0);
  //           response.body.items.length.should.not.equal(0);
  //           done();
  //         }
  //       })
  //   })          
  // })
})