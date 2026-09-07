import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readSourceFile } from "../helpers/projectPaths.mjs";

// Execute the production layout policy with measured border-box fixtures.
// These tests exercise real source calculations; browser geometry is verified separately.
const source = readSourceFile("pages/MobileExperience.tsx");
const parsed = ts.createSourceFile("MobileExperience.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const selected = parsed.statements.filter((statement) =>
  ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.every((declaration) => ts.isIdentifier(declaration.name) && /^(?:HEADER_COLLAPSE|SPACE_INLINE|SHELL_COLLAPSE|NAV_COLLAPSE|terminalExpanded)/.test(declaration.name.text))
    : ts.isFunctionDeclaration(statement) && statement.name?.text === "applyTerminalScrollState",
);
const javascript = ts.transpileModule(selected.map((statement) => statement.getText(parsed)).join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const apply = vm.runInNewContext(`${javascript}; applyTerminalScrollState;`);

function createTerminal({ navHeight = 147.2, safeTop = 16, settingsHeight = 16 } = {}) {
  const properties = new Map();
  const number = (name, fallback = 0) => Number.parseFloat(properties.get(name) ?? String(fallback));
  const headerHeight = () => Math.max(number("--terminal-header-height", 82), safeTop + 8 + 1 + Math.max(number("--terminal-brand-height", 58), settingsHeight));
  const header = { getBoundingClientRect: () => ({ height: headerHeight() }) };
  const nav = { getBoundingClientRect: () => ({ height: navHeight }) };
  const root = {
    style: { setProperty: (name, value) => properties.set(name, value), getPropertyValue: (name) => properties.get(name) ?? "" },
    querySelector: (selector) => selector === ".mobile-terminal-header" ? header : selector === ".mobile-terminal-nav" ? nav : null,
  };
  return { root, number, headerHeight, setNavHeight: (next) => { navHeight = next; } };
}

for (const language of ["en", "zh"]) {
  for (const theme of ["light", "dark"]) {
    test(`terminal shell clears measured navigation in ${language}/${theme} at every collapse state`, () => {
      const fixture = createTerminal({ navHeight: language === "zh" ? 156.8 : 147.2 });
      for (const scrollTop of [0, 9, 18, 27, 36, 120, 18, 0]) {
        apply(fixture.root, scrollTop);
        const navTop = fixture.number("--terminal-nav-top") + fixture.number("--terminal-nav-scroll-y");
        assert.ok(navTop >= fixture.headerHeight(), `navigation overlaps header at ${scrollTop}`);
        const navHeight = language === "zh" ? 156.8 : 147.2;
        assert.ok(fixture.number("--terminal-shell-top") >= navTop + navHeight, `shell overlaps navigation at ${scrollTop}`);
      }
    });
  }
}

test("safe-area and font/row reflow change the shell boundary without changing the scroll owner", () => {
  for (const safeTop of [16, 47, 59]) {
    const fixture = createTerminal({ safeTop });
    apply(fixture.root, 0);
    fixture.setNavHeight(191.5);
    apply(fixture.root, 0);
    assert.equal(fixture.number("--terminal-shell-top"), fixture.headerHeight() + 191.5);
    apply(fixture.root, 36);
    assert.equal(fixture.number("--terminal-shell-top"), fixture.headerHeight() + 191.5);
  }
});

test("collapse compensates the actual header shrink while document scroll remains one-to-one", () => {
  const fixture = createTerminal();
  apply(fixture.root, 0);
  const expandedTop = fixture.number("--terminal-shell-top");
  for (const scrollTop of [9, 18, 36, 120]) {
    apply(fixture.root, scrollTop);
    const documentTop = fixture.number("--terminal-shell-top") - scrollTop + fixture.number("--terminal-content-scroll-y");
    assert.equal(documentTop, expandedTop - scrollTop);
  }
});

const component = parsed.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "MobileExperience");
const layoutEffect = component.body.statements.find((statement) => ts.isExpressionStatement(statement)
  && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(parsed) === "useLayoutEffect");

test("layout ownership measures before paint, tracks chrome reflow, and disconnects on cleanup", () => {
  assert.ok(layoutEffect, "terminal chrome must be measured in a layout effect before paint");
  const fixture = createTerminal();
  const shell = { scrollTop: 0 };
  let cleanup;
  let observer;
  const effectScript = ts.transpileModule(layoutEffect.getText(parsed), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(`${javascript}\n${effectScript}`, {
    booting: false,
    language: "en",
    fontStatus: "ready",
    terminalRootRef: { current: fixture.root },
    terminalShellRef: { current: shell },
    useLayoutEffect: (effect) => { cleanup = effect(); },
    ResizeObserver: class {
      observed = [];
      disconnected = false;
      constructor(callback) { this.callback = callback; observer = this; }
      observe(element) { this.observed.push(element); }
      disconnect() { this.disconnected = true; }
    },
  });
  assert.equal(observer.observed.length, 2);
  assert.equal(fixture.number("--terminal-shell-top"), fixture.headerHeight() + 147.2);
  fixture.setNavHeight(177.5);
  observer.callback();
  assert.equal(fixture.number("--terminal-shell-top"), fixture.headerHeight() + 177.5);
  shell.scrollTop = 36;
  observer.callback();
  assert.equal(fixture.number("--terminal-shell-top"), fixture.headerHeight() + 177.5);
  cleanup();
  assert.equal(observer.disconnected, true);
});
