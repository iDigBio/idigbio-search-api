import _ from "lodash";

import {loadIndexTerms, clear, getMappingForType, checkTerms} from "lib/indexTerms";

describe('indexTerms', function() {
  it('should have been imported', function() {
    expect(loadIndexTerms).toBeTruthy();
  });

  describe(".loadIndexTerms", function() {
    it('should load all terms', async function() {
      clear();
      const its = await loadIndexTerms();
      expect(its).toEqual({
        publishers: expect.any(Object),
        recordsets: expect.any(Object),
        records: expect.any(Object),
        mediarecords: expect.any(Object)
      });
    });
  });


  describe(".getMappingForType", function() {
    it("Should error for an invalid type", async function() {
      expect(() => getMappingForType("adsf")).toThrow();
    });
    it("Should return the mapping when loaded", async function() {
      await loadIndexTerms();
      expect(getMappingForType('records')).toEqual(jasmine.any(Object));
    });
  });

  describe(".checkTerms", function() {
    beforeAll(() => loadIndexTerms());

    // function checkTerms(type, term_list, only_missing)

    it("should error on bad types", function() {
      expect(checkTerms.bind(null, "foobar", ["scientificName"], true)).toThrow();
    });
    it("Should return the valid terms", function() {
      expect(checkTerms('records', ["scientificname"], false))
        .toEqual({scientificname: true});
    });
    it("should return nothing on valid terms", function() {
      expect(checkTerms('records', ["scientificname"], true)).toEqual({});
      expect(checkTerms('records', ["data.dwc:scientificName"], true)).toEqual({});
    });
    it("should return the invalid terms", function() {
      expect(checkTerms('records', ["foobar"], true)).toEqual({foobar: false});
    });
    it("should handle wildcards", async function() {
      expect(checkTerms('records', ["data.dwc:*"], true)).toEqual({});
    });
  });
});
