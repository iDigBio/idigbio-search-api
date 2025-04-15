const request = require("request");
const mockPost = request.post = jest.fn();

import _ from "lodash";
import statsFromResponse from "lib/statsFromResponse";

describe("statsFromResponse", function() {
  it("Should look like this on a view request with search", async function() {
    const uuid = "1821c335-201e-4605-8799-454ac6276499",
          type = "records",
          _source =  {"recordset": "568e209f-d072-4fd6-8b64-27954b0fd731"},
          found = true,
          response = {hits: {hits: [{_id: uuid, uuid, type, _source, found}]}},
          statsInfo = {
            "type": "view",
            "recordtype": type,
            ip: "127.0.0.1"
          };
    statsFromResponse(uuid, statsInfo, response);
    expect(mockPost).toBeCalled();
    let postbody = mockPost.mock.calls[0][0].body;
    expect(postbody).toBeDefined();
    if(_.isString(postbody)) {
      postbody = JSON.parse(postbody);
      console.log(postbody);
    }
    expect(postbody.type).toEqual("view");
    expect(postbody.record_type).toEqual(type);
    expect(postbody.payload[uuid]).toEqual(_source["recordset"]);
  });

  // it("Should look like this on a view request using `get`", async function() {
  //   const uuid = "1821c335-201e-4605-8799-454ac6276499",
  //         type = "records",
  //         _source =  {"recordset": "568e209f-d072-4fd6-8b64-27954b0fd731"},
  //         found = true,
  //         response = {_id: uuid, uuid, type, _source, found},
  //         statsInfo = {
  //           "type": "view",
  //           "recordtype": type,
  //           ip: "127.0.0.1"
  //         };
  //   statsFromResponse(uuid, statsInfo, response);
  //   expect(mockPost).toBeCalled();
  //   let postbody = mockPost.mock.calls[0][0].body;
  //   expect(postbody).toBeDefined();
  //   if(_.isString(postbody)) {
  //     postbody = JSON.parse(postbody);
  //   }
  //   expect(postbody.type).toEqual("view");
  //   expect(postbody.record_type).toEqual(type);
  //   expect(postbody.payload[uuid]).toEqual(_source["recordset"]);
  // });


});
