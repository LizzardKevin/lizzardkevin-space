import assert from "node:assert/strict";

export function cssRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, "s"));
  assert.ok(match?.groups?.body, `${selector} rule should exist`);
  return match.groups.body;
}

export function mediaBlock(css, query) {
  const mediaStart = css.indexOf(`@media (${query})`);
  assert.notEqual(mediaStart, -1, `${query} media query should exist`);

  const blockStart = css.indexOf("{", mediaStart);
  assert.notEqual(blockStart, -1, `${query} media query should open a block`);

  let depth = 0;
  for (let index = blockStart; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(blockStart + 1, index);
  }

  assert.fail(`${query} media query should close its block`);
}

export function cssRuleInMedia(css, query, selector) {
  return cssRule(mediaBlock(css, query), selector);
}

export function declarationValue(ruleBody, property) {
  const match = ruleBody.match(new RegExp(`${property}\\s*:\\s*(?<value>[^;]+);`, "s"));
  assert.ok(match?.groups?.value, `${property} declaration should exist`);
  return match.groups.value.replace(/\s+/g, " ").trim();
}

export function cssBlock(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert(start >= 0, `${selector} CSS block must exist`);
  const end = css.indexOf("\n}", start);
  assert(end >= 0, `${selector} CSS block must close`);
  return css.slice(start, end);
}
