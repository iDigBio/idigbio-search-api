import searchShim from "searchShim";
import config from "config";
import logger from "logging";
import cache from "cache";
export var recordsets = {};

async function _loadAll() {
  logger.debug("Requerying recordsets list");
  const body = await searchShim(config.search.index, "recordsets", "_search", {size: config.maxRecordsets});
  const res = {};
  body.hits.hits.forEach(function(hit) {
    const id = hit._id,
          source = hit._source;
    res[id] = {
      "uuid": id,
      "name": source.data.collection_name,
      "description": source.data.collection_description,
      "logo": source.data.logo_url,
      "url": source.data.institution_web_address,
      "emllink": source.emllink,
      "archivelink": source.archivelink,
      "contacts": source.data.contacts,
      "data_rights": source.data.data_rights,
      "publisher": source.publisher,
    };
  });
  return res;
}

export async function loadAll() {
  try {
    recordsets = await cache.wrap("recordsets", _loadAll);
  } catch (e) {
    logger.error("Failed loading recordsets, %s", e);
  }
}


export async function get(id) {
  var rs = recordsets[id];
  if(rs) {
    return rs;
  }
  await loadAll();
  rs = recordsets[id];
  if(rs) {
    return rs;
  }
  throw new Error("Can't find recordset: " + id);
}

export async function clearcache() {
  recordsets = {};
}
