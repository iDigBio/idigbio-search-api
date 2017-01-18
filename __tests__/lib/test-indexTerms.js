import _ from "lodash";

import {TermNotFoundError, InvalidTypeError} from "lib/exceptions";
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
      expect(() => checkTerms("foobar", ["scientificName"])).toThrowError(InvalidTypeError);
    });
    it("should not throw on valid terms", function() {
      expect(checkTerms('records', ["scientificname", "genus"])).toBeUndefined();
      expect(checkTerms('records', ["data.dwc:scientificName", "data.coreid"])).toBeUndefined();
    });
    it("should throw on invalid terms", function() {
      const fncall = () => checkTerms('records', ["foobar"]);
      expect(fncall).toThrow(TermNotFoundError);
    });
    it("Should be looking for the term on the right type", function() {
      const fncall = (t) => checkTerms(t, ["accessuri"]);
      expect(() => fncall('records')).toThrow(TermNotFoundError);
      expect(fncall('mediarecords')).toBeUndefined();
    });
    it("should handle wildcards", async function() {
      checkTerms('records', ["data.dwc:*"]);
      // We don't currently support verifying these
      checkTerms('records', ["data.foobar:*"]);
    });
  });
});
