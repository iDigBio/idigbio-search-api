import searchShim from "searchShim";
import config from "config";

var loading = null;
var recordsets = {};

export async function loadAll() {
  if(loading) { return loading; }
  loading = searchShim(config.search.index, "recordsets", "_search", {size: config.maxRecordsets});
  try {
    let body = await loading;
    recordsets = {};
    body.hits.hits.forEach(function(hit) {
      recordsets[hit._id] = {
        "name": hit._source.data.collection_name,
        "description": hit._source.data.collection_description,
        "logo": hit._source.data.logo_url,
        "url": hit._source.data.institution_web_address,
        "emllink": hit._source.emllink,
        "archivelink": hit._source.archivelink,
        "contacts": hit._source.data.contacts,
        "data_rights": hit._source.data.data_rights,
        "publisher": hit._source.publisher,
      };
    });

  } catch (err) {
    console.error("Failed fetching recordsets", err);
  }
  loading = null;
  return recordsets;
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
  console.warn("Clearing recordset caches while loading is underway.");
  if(loading) {
    await loading;
  }
  config.recordsets = {};
}
