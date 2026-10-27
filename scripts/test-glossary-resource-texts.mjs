import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function harness() {
  const state = { epoch: 0, fail: false, race: false, bad: false },
    stored = new Map(),
    reads = [],
    writes = [],
    dependencies = [];
  const key = (site, lang, path) => [site, lang, path].join("|");
  const service = {
    prepareResourceTexts(site, lang, json) {
      if (state.fail) throw Error("unavailable");
      const paths = JSON.parse(json);
      assert(paths.length <= 128);
      reads.push(paths);
      const rows = paths.map((path) => ({
        path,
        paths: [path, path + "/j:translation_" + lang],
        token: String(state.epoch),
        ...(stored.has(key(site, lang, path))
          ? { text: stored.get(key(site, lang, path)) }
          : { parts: ["<p>" + lang + "</p>", "<p>" + path + "</p>"] }),
      }));
      if (state.race) state.epoch++;
      return JSON.stringify(state.bad ? rows.slice(1) : rows);
    },
    cacheResourceTexts(site, lang, generation, json) {
      assert.equal(generation, state.epoch);
      const values = JSON.parse(json);
      writes.push(values);
      for (const row of values) stored.set(key(site, lang, row.path), row.text);
    },
  };
  const exports = {},
    source = ts.transpileModule(
      readFileSync(
        new URL("../src/contents/GlossaryEntry/memo.server.ts", import.meta.url),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText;
  vm.runInNewContext(source, {
    exports,
    console,
    require(name) {
      assert.equal(name, "@jahia/javascript-modules-library");
      return {
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- SDK API stub in a VM fixture.
        useServerContext: () => ({ renderContext: {} }),
        server: { render: { addCacheDependency: ({ path }) => dependencies.push(path) } },
      };
    },
  });
  const memo = () => ({
    service,
    generation: String(state.epoch),
    valid: (() => {
      const generation = state.epoch;
      return () => generation === state.epoch;
    })(),
  });
  return {
    state,
    stored,
    reads,
    writes,
    dependencies,
    memo,
    exports,
    read: (paths, prepare, lang = "fr", site = "/sites/test") =>
      exports.resourceTexts(memo(), site, lang, paths, prepare),
  };
}

test("resource texts are prepared once and reused across entries without changing spacing or order", () => {
  const h = harness();
  let conversions = 0;
  const prepare = (parts) => {
    conversions++;
    return parts.map((p) => p.replace(/<[^>]+>/g, "")).join(" ");
  };
  const paths = ["/sites/test/article-b", "/sites/test/article-a"];
  const first = h.read(paths, prepare);
  const second = h.read([...paths].reverse(), prepare);
  assert.equal(conversions, 2);
  for (const path of paths) assert.equal(first.get(path), second.get(path));
  assert.equal(first.get(paths[0]), "fr /sites/test/article-b");
  assert.equal(h.writes.length, 1);
  assert.equal(h.reads.length, 2);
  assert.equal(h.dependencies.filter((p) => p.endsWith("/j:translation_fr")).length, 4);
});

test("batching covers the whole resource pool, including the final partial batch", () => {
  const h = harness();
  const paths = Array.from({ length: 257 }, (_, i) => "/sites/test/resource-" + i);
  const result = h.read(paths, (parts) => parts.join(" "));
  assert.equal(result.size, 257);
  assert.deepEqual(
    h.reads.map((x) => x.length),
    [128, 128, 1],
  );
  assert.ok(result.has(paths.at(-1)));
});

test("sites and languages keep separate prepared strings and empty texts are valid hits", () => {
  const h = harness();
  let count = 0;
  const prepare = () => {
    count++;
    return "";
  };
  assert.equal(h.read(["/sites/test/a"], prepare).get("/sites/test/a"), "");
  h.read(["/sites/test/a"], prepare);
  assert.equal(count, 1);
  h.read(["/sites/test/a"], prepare, "en");
  h.read(["/sites/other/a"], prepare, "fr", "/sites/other");
  assert.equal(count, 3);
});

test("unavailable cache, malformed batches and invalidation never return a partial or stale pool", () => {
  const h = harness();
  h.state.fail = true;
  assert.equal(
    h.read(["/sites/test/a"], () => ""),
    undefined,
  );
  h.state.fail = false;
  h.state.bad = true;
  assert.equal(
    h.read(["/sites/test/a"], () => ""),
    undefined,
  );
  h.state.bad = false;
  h.state.race = true;
  assert.equal(
    h.read(["/sites/test/a"], () => ""),
    undefined,
  );
  assert.equal(h.writes.length, 0);
  assert.equal(
    h.exports.resourceTexts(undefined, "/sites/test", "fr", ["/sites/test/a"], () => {
      throw Error("No guest cache");
    }),
    undefined,
  );
});
