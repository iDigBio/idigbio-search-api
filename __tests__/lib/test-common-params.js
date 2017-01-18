import _ from "lodash";

import {loadIndexTerms} from "lib/indexTerms";
import * as cp from "lib/common-params.js";

//NB: this module using jest/jasmine's expect

describe("common parameters", function() {
  beforeAll(async function() {
    await loadIndexTerms();
  });

  function makeMockReq(query = {}, body = {}) {
    return {query, body};
  }

  describe("sort", function() {
    function checkSortShape(sortresult) {
      expect(sortresult).toEqual(expect.any(Array));
      expect(sortresult.length).toBeGreaterThan(0);
      _.each(sortresult, function(sortpart) {
        expect(sortpart).toEqual(expect.any(Object));
        _.each(sortpart, function(sortval, sortkey) {
          expect(sortval['order']).toMatch(/asc|desc/);
        });
      });
      return sortresult;
    }
    it("should have a default sort",  function() {
      checkSortShape(cp.sort(makeMockReq()));
    });
    it("should look for a single field", function() {
      const req = makeMockReq({sort: 'scientificname'});
      const res = checkSortShape(cp.sort(req));
      expect(res[0]['scientificname']).toEqual({order: "asc"});
    });
    it("should sort on a list of fields", function() {
      const req = makeMockReq({sort: ['genus', 'scientificname']});
      const res = checkSortShape(cp.sort(req));
      expect(res[0]['genus']).toEqual({order: "asc"});
      expect(res[1]['scientificname']).toEqual({order: "asc"});
    });
    it("should sort on a list of fields and directions", function() {
      const sortspec = [{"genus": "desc"}, {"specificepithet": "asc"}];
      const req = makeMockReq({sort: sortspec});
      const res = checkSortShape(cp.sort(req));
      expect(res[0]["genus"]).toEqual({order: "desc"});
      expect(res[1]["specificepithet"]).toEqual({order: "asc"});
    });
    it("should handle weird specs", function() {
      const sortspec = ["genus", {"specificepithet": {order: "desc", mode: "max"}}];
      const req = makeMockReq({sort: sortspec});
      const res = checkSortShape(cp.sort(req));
      expect(res[0]["genus"]).toEqual({order: "asc"});
      expect(res[1]["specificepithet"]).toEqual({order: "desc", mode: "max"});

    });
  });

  describe("Numeric Parameters", function() {
    function testNumericParam(paramName, funcName) {
      describe(funcName, function() {
        it("should have a default",  function() {
          const res = cp.limit(makeMockReq());
          expect(res).toEqual(expect.any(Number));
        });
        it("Should use the specified", function() {
          const req = {};
          req[paramName] = 10;
          const res = cp[funcName](makeMockReq(req));
          expect(res).toEqual(10);
        });

        it("should throw an error on bad specification", function() {
          let req = {};
          req[paramName] = "five";
          req = makeMockReq(req);
          expect(() => cp[funcName](req)).toThrow(/numeric/);
        });
      });
    }
    testNumericParam('limit', 'limit');
    testNumericParam('offset', 'offset');
    testNumericParam('count', 'top_count');
    testNumericParam('threshold', 'threshold');
  });

  describe("query", function() {
    it("should default to empty", async function() {
      expect(cp.query('rq', makeMockReq())).toEqual({});
    });
    it("should return the given object", function() {
      const req = makeMockReq({rq: {"genus": "acer"}});
      expect(cp.query('rq', req)).toEqual({"genus": "acer"});
    });
    it("should parse a json string too", async function() {
      const req = makeMockReq({rq: JSON.stringify({"genus": "acer"})});
      expect(cp.query('rq', req)).toEqual({"genus": "acer"});
    });

  });


  describe("top_fields", function() {
    it("Should not have a default", function() {
      expect(cp.top_fields(makeMockReq())).toBeUndefined();
    });
    it("should use a specified single fieldname", function() {
      const res = cp.top_fields(makeMockReq({top_fields: 'kingdom'}));
      expect(res).toEqual(['kingdom']);
    });
    it("should use specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.top_fields(makeMockReq({top_fields: list}));
      expect(res).toEqual(list);
    });
    it("should json decode specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.top_fields(makeMockReq({top_fields: JSON.stringify(list)}));
      expect(res).toEqual(list);
    });
    it("should error on an invalid fieldname", function() {
      const req = makeMockReq({top_fields: ["foobar"]});
      expect(() => cp.top_fields(req, 'records')).toThrow(/top_fields/);
    });
  });

  describe("fields", function() {
    it("Should not have a default", function() {
      expect(cp.fields(makeMockReq())).toBeUndefined();
    });
    it("should use a specified single fieldname", function() {
      const res = cp.fields(makeMockReq({fields: 'kingdom'}));
      expect(res).toEqual(['kingdom']);
    });
    it("should use specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.fields(makeMockReq({fields: list}));
      expect(res).toEqual(list);
    });
    it("should json decode specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.fields(makeMockReq({fields: JSON.stringify(list)}));
      expect(res).toEqual(list);
    });
    it("should error on an invalid fieldname", function() {
      const req = makeMockReq({fields: ["foobar"]});
      expect(() => cp.fields(req, 'records')).toThrow(/fields/);
    });
  });

  describe("fields_exclude", function() {
    it("Should not have a default", function() {
      expect(cp.fields_exclude(makeMockReq())).toBeUndefined();
    });
    it("should use a specified single fieldname", function() {
      const res = cp.fields_exclude(makeMockReq({fields_exclude: 'kingdom'}));
      expect(res).toEqual(['kingdom']);
    });
    it("should use specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.fields_exclude(makeMockReq({fields_exclude: list}));
      expect(res).toEqual(list);
    });
    it("should json decode specified multiple fieldnames", function() {
      const list = ['kingdom', 'phylum'];
      const res = cp.fields_exclude(makeMockReq({fields_exclude: JSON.stringify(list)}));
      expect(res).toEqual(list);
    });
    it("should error on an invalid fieldname", function() {
      const req = makeMockReq({fields_exclude: ["foobar"]});
      expect(() => cp.fields_exclude(req, 'records')).toThrow(/fields_exclude/);
    });
  });

  describe("noattr", function() {
    it("should default to false", function() {
      expect(cp.noattr(makeMockReq())).toBeFalsy();
    });
    it("should accept true values", function() {
      expect(cp.noattr(makeMockReq({no_attribution: true}))).toBeTruthy();
      expect(cp.noattr(makeMockReq({no_attribution: 'true'}))).toBeTruthy();
      expect(cp.noattr(makeMockReq({no_attribution: '1'}))).toBeTruthy();
    });
    it("should accept false values", function() {
      expect(cp.noattr(makeMockReq({no_attribution: false}))).toBeFalsy();
      expect(cp.noattr(makeMockReq({no_attribution: 'false'}))).toBeFalsy();
      expect(cp.noattr(makeMockReq({no_attribution: '0'}))).toBeFalsy();
    });
  });
});
