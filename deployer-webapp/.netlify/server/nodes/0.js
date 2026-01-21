

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.CfqfAOPr.js","_app/immutable/chunks/B2QSKqcC.js","_app/immutable/chunks/DNLv8VTe.js"];
export const stylesheets = [];
export const fonts = [];
