const EXHIBIT_IDS = new Set([
  "arch_treehabitat",
  "arch_uabb_exhibit",
  "arch_3d_printing_architecture",
]);

export function isKnownExhibitId(exhibitId: string) {
  return EXHIBIT_IDS.has(exhibitId);
}
