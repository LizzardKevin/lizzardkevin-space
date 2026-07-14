import ts from "typescript";

function literalSpecifier(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

export function extractDependencySpecifiers(source, fileName = "source.tsx") {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const staticSpecifiers = [];
  const dynamicSpecifiers = [];
  const requireSpecifiers = [];
  let unresolvedDynamicImport = false;

  function visit(node) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      const specifier = literalSpecifier(node.moduleSpecifier);
      if (specifier !== undefined) staticSpecifiers.push(specifier);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
      const specifier = literalSpecifier(node.moduleSpecifier);
      if (specifier !== undefined) staticSpecifiers.push(specifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      const specifier = literalSpecifier(node.moduleReference.expression);
      if (specifier !== undefined) staticSpecifiers.push(specifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const specifier = node.arguments[0] && literalSpecifier(node.arguments[0]);
      if (specifier === undefined) unresolvedDynamicImport = true;
      else dynamicSpecifiers.push(specifier);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const specifier = node.arguments[0] && literalSpecifier(node.arguments[0]);
      if (specifier !== undefined) requireSpecifiers.push(specifier);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { staticSpecifiers, dynamicSpecifiers, requireSpecifiers, unresolvedDynamicImport };
}

export function staticDependencySpecifiers(source, fileName) {
  return extractDependencySpecifiers(source, fileName).staticSpecifiers;
}

export function dynamicImportSpecifiers(source, fileName) {
  return extractDependencySpecifiers(source, fileName).dynamicSpecifiers;
}

export function hasUnresolvedDynamicImport(source, fileName) {
  return extractDependencySpecifiers(source, fileName).unresolvedDynamicImport;
}
