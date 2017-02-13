jest.mock('redisclient');
jest.mock('esclient');

import _ from "lodash";
import bluebird from "bluebird";

import * as rsmod from "lib/recordsets";
//NB: this is using Jest's builtin assertions instead of chai


const testRecordset = 'd5c32031-231f-4213-b0f1-2dc4bbf711a0';
const test404 = '00000000-0000-0000-0000-000000000000';

describe('recordsets', function() {
    it('should loadAll successfully', async function() {
      await rsmod.loadAll();
      expect(_.keys(rsmod.recordsets).length).toBeGreaterThan(10);
    });

    it('should return a recordset', async function() {
      const rs = await rsmod.get(testRecordset);
      expect(rs.uuid).toEqual(testRecordset);
    });

    it('should return a recordset with the cache unprimed', async function() {
      await rsmod.clearcache();
      const rs = await rsmod.get(testRecordset);
      expect(rs.uuid).toEqual(testRecordset);
    });

    it('should collapse two requests to one', async function() {
      await rsmod.clearcache();
      await bluebird.all([
        rsmod.get(testRecordset),
        rsmod.get(testRecordset)
      ])
        .spread(function(rs1, rs2) {
          expect(rs1.uuid).toEqual(testRecordset);
          expect(rs2.uuid).toEqual(testRecordset);
          // these should be the same object if they came from the same loadall
          rs1.sigil = true;
          expect(rs2.sigil).toEqual(true);
        });
    });

  it("should throw on a non-existant recordset", async function() {
    try {
      const rs = await rsmod.get(test404);
      fail("Shouldn't get here");
    } catch (e) {
      expect(e.message).toMatch(/Can't find recordset/);
    }
  });
});
