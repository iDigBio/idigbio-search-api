
import _ from "lodash";
import bluebird from "bluebird";
import fsOrig from "fs";
const fs = bluebird.promisifyAll(fsOrig);

import hash from "./hasher";


export async function writeMock(h, body) {
  var b = _.cloneDeep(body),
      filename = "test/mock/" + h + ".json";
  delete b.took;
  try {
    await fs.writeFileAsync(filename, JSON.stringify(b, null, 2));
  } catch (err) {
    console.error("Failed writing mock to", filename);
  }
}

export async function readMock(index, type, op, query, cb, statsInfo) {
  console.log("Seearch:", [index, type, op, query]);
  const h = hash("sha256", [index, type, op, query]);
  const filename = "test/mock/" + h + ".json";
  console.log("Reading mock from", filename);
  try {
    return await fs.readFileAsync(filename);
  } catch (err) {
    throw new Error("No json mock for " + h);
  }
}
