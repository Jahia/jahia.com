import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const braces = require("braces");
const tooDeep = (open, close) => open.repeat(4500) + "a,b" + close.repeat(4500);
const rejected = (operation) =>
  assert.throws(operation, { name: "SyntaxError", code: "BRACES_MAX_DEPTH" });

for (const [name, operation] of Object.entries({
  default: (pattern) => braces(pattern),
  parse: (pattern) => braces.parse(pattern),
  compile: (pattern) => braces.compile(pattern),
  expand: (pattern) => braces.expand(pattern),
  stringify: (pattern) => braces.stringify(pattern),
})) {
  test(
    `${name} rejects excessive braces and parentheses before stack exhaustion`,
    { timeout: 3000 },
    () => {
      for (const [open, close] of [
        ["{", "}"],
        ["(", ")"],
        ["{(", ")}"],
      ]) {
        const count = open.length === 1 ? 4500 : 2200;
        const pattern = open.repeat(count) + "a,b" + close.repeat(count);
        assert.ok(pattern.length < 10000);
        rejected(() => operation(pattern));
      }
      rejected(() => operation("{".repeat(4500) + "a,b"));
    },
  );
}

for (const method of ["compile", "expand", "stringify"]) {
  test(`${method} also guards a caller-supplied AST`, { timeout: 3000 }, () => {
    const root = { type: "root", nodes: [] };
    let parent = root;
    for (let i = 0; i < 4500; i++) {
      const child = { type: "paren", nodes: [], parent };
      parent.nodes.push(child);
      parent = child;
    }
    rejected(() => braces[method](root));
  });
}

test("ordinary globs, ranges, nesting and escaping retain their behavior", () => {
  assert.deepEqual(braces.expand("src/{views,contents}/**/*.{ts,tsx}"), [
    "src/views/**/*.ts",
    "src/views/**/*.tsx",
    "src/contents/**/*.ts",
    "src/contents/**/*.tsx",
  ]);
  assert.deepEqual(braces.expand("{01..03}"), ["01", "02", "03"]);
  assert.deepEqual(braces.expand("a{b,c,/{x,y}}/e"), ["ab/e", "ac/e", "a/x/e", "a/y/e"]);
  assert.deepEqual(braces.expand("a\\{b,c}d"), ["a{b,c}d"]);
  assert.equal(braces.compile("a/{b,c}/d"), "a/(b|c)/d");
  assert.equal(braces.stringify(braces.parse("a/{b,c}/d")), "a/{b,c}/d");
  const boundary = "{".repeat(128) + "x" + "}".repeat(128);
  assert.equal(braces.stringify(boundary), boundary);
  for (const method of ["parse", "compile", "expand", "stringify"])
    rejected(() => braces[method]("{".repeat(129) + "x" + "}".repeat(129)));
  const literal = "\\{".repeat(1000);
  assert.equal(braces.stringify(literal), "{".repeat(1000));
});

test("micromatch and chokidar resolve the patched dependency", () => {
  for (const consumer of ["micromatch", "chokidar"]) {
    const dependentRequire = createRequire(require.resolve(consumer));
    rejected(() => dependentRequire("braces").expand(tooDeep("{", "}")));
  }
  const micromatch = require("micromatch");
  assert.deepEqual(micromatch(["a.ts", "b.tsx", "c.css"], "*.{ts,tsx}"), ["a.ts", "b.tsx"]);
});
