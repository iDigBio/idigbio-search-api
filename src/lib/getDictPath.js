export default function(obj, path) {
  for(var i = 0; obj && i < path.length; i++) {
    obj = obj[path[i]];
  }
  return obj;
}
