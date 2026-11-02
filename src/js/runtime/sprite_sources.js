// Image ownership is independent of missions and drawing. A late load from an
// old mission cannot repopulate the current mission's decoded-image cache.
function createSpriteSources(catalog, makeImage = () => new Image(), now = () => performance.now()) {
  const loaded = Object.create(null), pending = Object.create(null);
  let wanted = new Set();
  const retryAt = new Map();
  function load(name) {
    if (!catalog?.[name]) return Promise.resolve(null);
    wanted.add(name);
    if (loaded[name]) return Promise.resolve(loaded[name]);
    if (pending[name]) return pending[name];
    if ((retryAt.get(name) || 0) > now()) return Promise.resolve(null);
    return pending[name] = new Promise(resolve => {
      const img = makeImage();
      img.onload = () => {
        delete pending[name]; retryAt.delete(name);
        const source = { img, w:img.width, h:img.height, parts:[] };
        if (wanted.has(name)) loaded[name] = source;
        resolve(wanted.has(name) ? source : null);
      };
      img.onerror = () => { delete pending[name]; retryAt.set(name,now()+3000); resolve(null); };
      img.src = catalog[name].src;
    });
  }
  function retain(names) {
    wanted = new Set(names);
    for (const name of retryAt.keys()) if (!wanted.has(name)) retryAt.delete(name);
    for (const name of Object.keys(loaded)) if (!wanted.has(name)) delete loaded[name];
  }
  function snapshot() {
    return { loaded:Object.keys(loaded).sort(), pending:Object.keys(pending).sort(),
      decodedRgbaEstimate:Object.values(loaded).reduce((n,s) => n+s.w*s.h*4,0) };
  }
  return { loaded, pending, load, retain, snapshot };
}
