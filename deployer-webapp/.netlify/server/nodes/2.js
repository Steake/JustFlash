

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.WybGvoih.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/chunks/DNLv8VTe.js"];
export const stylesheets = ["_app/immutable/assets/2.KrfumMBl.css"];
export const fonts = [];
