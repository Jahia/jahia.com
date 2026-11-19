import { test } from "node:test";
import assert from "node:assert/strict";
import {
  load,
  save,
  publish,
  seedSettings,
  sitePath,
  loadIconImage,
  loadPreviewReferences,
} from "../javascript/navigation/api.js";
import { decodeSettings, emptySection } from "../javascript/navigation/model.js";
import {
  navigationRows,
  navigationColumnRows,
  assignedColumn,
} from "../javascript/navigation/structure.js";

test("column editing keeps source branches and ancestry whole without changing source order", () => {
  const node = (id, children = []) => ({ id, children });
  const source = node("root", [
    node("first", [node("child", [node("grandchild")])]),
    node("second"),
    node("new"),
  ]);
  const section = { ...emptySection(), columnCount: 3, columns: { first: 2, second: 1 } };
  const before = structuredClone(source),
    rows = navigationRows(source);
  assert.deepEqual(
    rows.map((row) => row.node.id),
    ["first", "child", "grandchild", "second", "new"],
  );
  assert.deepEqual(rows[2].ancestors, ["first", "child"]);
  assert.equal(rows[2].depth, 2);
  const columns = () =>
    navigationColumnRows(rows, section).map((column) => column.map((row) => row.node.id));
  assert.deepEqual(columns(), [["second", "new"], ["first", "child", "grandchild"], []]);
  section.columns.first = 3;
  assert.deepEqual(columns(), [["second", "new"], [], ["first", "child", "grandchild"]]);
  assert.deepEqual(source, before);
  section.columnCount = 2;
  assert.equal(assignedColumn(section, "first"), 2);
  assert.deepEqual(columns(), [
    ["second", "new"],
    ["first", "child", "grandchild"],
  ]);
});

const settings = () => ({ version: 1, mode: "automatic", sections: {} });

test("preview destinations are read-only, scoped to the current site and validate IDs before querying", async () => {
  let calls = 0;
  assert.deepEqual(
    await loadPreviewReferences("test", ["resource"], async (query, variables) => {
      calls++;
      assert.ok(query.startsWith("query"));
      assert.match(variables.query, /ISDESCENDANTNODE\(n, '\/sites\/test'\)/);
      assert.ok(variables.query.includes("n.[jcr:uuid] = 'resource'"));
      assert.ok(!variables.query.includes(" IN "));
      return { jcr: { nodesByQuery: { nodes: [] } } };
    }),
    [],
  );
  assert.equal(calls, 1);
  for (const ids of [["bad' OR 1=1"], ["../other"], [1]])
    await assert.rejects(
      loadPreviewReferences("test", ids, () => {
        throw Error("Must not query");
      }),
      /Invalid/,
    );
  await assert.rejects(
    loadPreviewReferences("../test", [], () => {}),
    /Invalid/,
  );
});

test("optional label weights accept bold/normal and reject CSS, invalid keys or missing maps", () => {
  const config = {
    ...settings(),
    sections: { root: { ...emptySection(), weights: { cms: "bold", dxp: "normal" } } },
  };
  assert.deepEqual(decodeSettings(JSON.stringify(config)), config);
  for (const weights of [
    null,
    [],
    { cms: "700" },
    { cms: true },
    { "bad/path": "bold" },
    { cms: "auto" },
  ]) {
    config.sections.root.weights = weights;
    assert.throws(() => decodeSettings(JSON.stringify(config)), /weight/);
  }
});

test("child ordering stays within each parent, moves its descendants and preserves column order", () => {
  const node = (id, children = []) => ({ id, children });
  const source = node("root", [
    node("parent", [node("first", [node("grandchild")]), node("second"), node("new")]),
    node("other", [node("other-child")]),
  ]);
  const original = structuredClone(source);
  const section = {
    ...emptySection(),
    order: { 1: ["other", "parent"] },
    childOrder: {
      parent: ["removed", "other-child", "second", "first"],
      first: ["grandchild"],
      missing: ["first"],
    },
  };
  const columns = navigationColumnRows(navigationRows(source), section);
  assert.deepEqual(
    columns[0].map((row) => row.node.id),
    ["other", "other-child", "parent", "second", "first", "grandchild", "new"],
  );
  assert.deepEqual(columns[0].find((row) => row.node.id === "grandchild").ancestors, [
    "parent",
    "first",
  ]);
  assert.deepEqual(source, original);
  section.columns.parent = 2;
  assert.deepEqual(
    navigationColumnRows(navigationRows(source), section).map((column) =>
      column.map((row) => row.node.id),
    ),
    [
      ["other", "other-child"],
      ["parent", "second", "first", "grandchild", "new"],
    ],
  );
});

test("child order is optional and rejects invalid parent keys, non-arrays and duplicate IDs", () => {
  for (const childOrder of [
    null,
    [],
    { parent: "child" },
    { "bad/path": [] },
    { parent: ["child", "child"] },
    { parent: [1] },
  ]) {
    assert.throws(
      () =>
        decodeSettings(
          JSON.stringify({
            ...settings(),
            sections: { root: { ...emptySection(), childOrder } },
          }),
        ),
      /child order/,
    );
  }
  const config = {
    ...settings(),
    sections: { root: { ...emptySection(), childOrder: { parent: ["second", "first"] } } },
  };
  assert.deepEqual(decodeSettings(JSON.stringify(config)), config);
});

test("custom column order moves whole branches, ignores stale IDs and appends new branches", () => {
  const node = (id, children = []) => ({ id, children });
  const source = node("root", [node("first", [node("child")]), node("second"), node("new")]);
  const before = structuredClone(source);
  const section = { ...emptySection(), order: { 1: ["removed", "second", "first"] } };
  assert.deepEqual(
    navigationColumnRows(navigationRows(source), section)[0].map((row) => row.node.id),
    ["second", "first", "child", "new"],
  );
  assert.deepEqual(source, before);
  for (const order of [{ 0: ["first"] }, { 5: [] }, { 1: ["first", "first"] }, { 1: [2] }, []]) {
    assert.throws(() =>
      decodeSettings(
        JSON.stringify({
          ...settings(),
          sections: { root: { ...emptySection(), order } },
        }),
      ),
    );
  }
  assert.ok(decodeSettings(JSON.stringify({ ...settings(), sections: { root: section } })));
});

test("icon overrides preserve old configurations and reject URLs or invalid choices", () => {
  const config = { ...settings(), sections: { section: emptySection() } };
  assert.ok(decodeSettings(JSON.stringify(config)));
  config.sections.section.icons = {
    root: null,
    page: { kind: "preset", name: "cms" },
    child: { kind: "image", id: "media-id" },
  };
  assert.deepEqual(decodeSettings(JSON.stringify(config)), config);
  for (const bad of [
    { kind: "preset", name: "other" },
    { kind: "image", id: "javascript:alert(1)" },
    "https://example.com/icon.png",
    false,
    [],
  ]) {
    config.sections.section.icons.page = bad;
    assert.throws(() => decodeSettings(JSON.stringify(config)), /icon/);
  }
});

test("image lookup accepts only accessible Jahia images and validates IDs before querying", async () => {
  let calls = 0;
  await assert.rejects(
    loadIconImage("bad' OR 1=1", "fr", async () => {
      calls++;
    }),
    /Invalid/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    loadIconImage("missing", "fr", async () => ({ jcr: { nodesByQuery: { nodes: [] } } })),
    /IMAGE_UNAVAILABLE/,
  );
  const image = { uuid: "image", url: "/files/default/icon.png" };
  assert.deepEqual(
    await loadIconImage("image", "fr", async (_query, variables) => {
      assert.match(variables.query, /FROM \[jmix:image\]/);
      return { jcr: { nodesByQuery: { nodes: [image] } } };
    }),
    image,
  );
});
const tree = (exists = false) => ({
  jcr: {
    site: {
      mode: { value: "automatic" },
      children: { nodes: exists ? [{ name: "navigation-settings" }] : [] },
    },
    home: { children: { nodes: [] } },
  },
});

test("opening the extension loads the source without creating or saving configuration", async () => {
  const calls = [];
  const snapshot = await load("site-one", async (query) => {
    calls.push(query);
    return tree();
  });
  assert.equal(snapshot.exists, false);
  assert.equal(snapshot.settings.mode, "automatic");
  assert.ok(calls.every((query) => !query.includes("mutation")));
});

test("conflicting changes are rejected before any write", async () => {
  const calls = [];
  const changed = JSON.stringify({ ...settings(), mode: "legacy" });
  await assert.rejects(
    save(
      { site: "site-one", exists: true, raw: JSON.stringify(settings()) },
      settings(),
      async (query) => {
        calls.push(query);
        return query.includes("home:nodeByPath")
          ? tree(true)
          : {
              jcr: {
                nodeByPath: {
                  kind: { value: "jahiacom:navigationSettings" },
                  configuration: { value: changed },
                },
              },
            };
      },
    ),
    /CONFLICT/,
  );
  assert.ok(calls.every((query) => !query.includes("mutation")));
});

test("publication is limited to the configuration node and never includes a site subtree", async () => {
  const calls = [];
  const raw = JSON.stringify(settings());
  await publish({ site: "site-one", raw }, async (query, variables) => {
    calls.push({ query, variables });
    return {
      jcr: {
        nodeByPath: {
          configuration: { value: raw },
          fr: { allowedToPublishWithoutWorkflow: true },
          en: { allowedToPublishWithoutWorkflow: true },
          live: { configuration: { value: raw } },
        },
      },
    };
  });
  const mutation = calls.find((call) => call.query.startsWith("mutation"));
  assert.equal(mutation.variables.path, "/sites/site-one/navigation-settings");
  assert.match(mutation.query, /publishSubNodes:false,includeSubTree:false/);
  assert.doesNotMatch(mutation.query, /\/home/);
});

test("publication never reports success before LIVE matches and rejects concurrent edits or missing rights", async () => {
  const raw = JSON.stringify(settings()),
    snapshot = { site: "site-one", raw };
  const allowed = { allowedToPublishWithoutWorkflow: true };
  const result = (value = raw, permission = allowed) => ({
    jcr: {
      nodeByPath: {
        configuration: { value },
        fr: permission,
        en: permission,
        live: { configuration: { value: "old" } },
      },
    },
  });
  let mutations = 0;
  assert.equal(
    await publish(
      snapshot,
      async (query) => {
        if (query.startsWith("mutation")) mutations++;
        return result();
      },
      async () => {},
    ),
    false,
  );
  assert.equal(mutations, 1);
  for (const state of [
    result("changed"),
    result(raw, { allowedToPublishWithoutWorkflow: false }),
    result(raw, { ...allowed, locked: true }),
    result(raw, { ...allowed, workInProgress: true }),
  ]) {
    await assert.rejects(
      publish(snapshot, async (query) => {
        assert.ok(!query.startsWith("mutation"));
        return state;
      }),
      /CONFLICT|PUBLICATION_NOT_ALLOWED/,
    );
  }
});

test("site and configuration validation reject paths, bad versions and non-string node IDs", () => {
  for (const site of ["../other", "site/home", "", "site' OR 1=1"])
    assert.throws(() => sitePath(site));
  assert.throws(() => decodeSettings('{"version":99,"mode":"automatic","sections":{}}'));
  assert.throws(() =>
    decodeSettings(
      JSON.stringify({ ...settings(), sections: { test: { ...emptySection(), selected: [1] } } }),
    ),
  );
});

test("migration keeps source branches whole and preserves direct and hidden sections", () => {
  const node = (id, children = [], native = {}, kind = "jnt:page") => ({
    id,
    name: id,
    kind,
    native,
    children,
    fr: {},
    en: {},
  });
  const source = node(
    "solutions",
    [node("portals", [node("finance")]), node("migration", [node("diagnostic")])],
    { navColumnOneLinks: ["portals"], navColumnTwoLinks: ["migration"] },
    "jnt:navMenuText",
  );
  const migrated = seedSettings([
    source,
    node("cases", [node("case")], { navExpandChildren: "false" }),
  ]);
  assert.deepEqual(migrated.sections.solutions.columns, { portals: 1, migration: 2 });
  assert.equal(migrated.sections.solutions.columns.finance, undefined);
  assert.equal(migrated.sections.cases.mode, "link");
  const newRoot = node("new-root", [
    node("group-one", [], {}, "jnt:navMenuText"),
    node("group-two", [], {}, "jnt:navMenuText"),
  ]);
  assert.deepEqual(seedSettings([newRoot]).sections["new-root"].columns, {
    "group-one": 1,
    "group-two": 1,
  });
});
