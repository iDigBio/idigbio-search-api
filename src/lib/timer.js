
export default function(wrappedFn, name) {
  name = name || wrappedFn.name;
  return async function(...args) {
    var t1 = new Date();
    console.log("Starting", name);
    try {
      return await wrappedFn(...args);
    } finally {
        var t2 = new Date();
        console.log("Finished", name, "in", t2 - t1);
    }
  };
}
