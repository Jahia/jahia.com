import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { validateSnapshots, main } from "./repair-publication.mjs";

const prop = (name, value) => ({ name, value, values: null });
const node = (properties = []) => ({
  uuid: "same-id",
  path: "/sites/example/contents/item",
  properties,
});
const pair = () => [
  node([prop("jcr:title", "Imported item"), prop("j:url", "https://academy.jahia.com/")]),
];

test("publication bookkeeping differences do not publish editorial changes", () => {
  const edit = pair(),
    live = pair();
  live[0].properties.push(prop("j:lastPublished", "2020-01-01"));
  edit[0].properties.push(prop("j:lastPublished", "2026-01-01"));
  assert.doesNotThrow(() => validateSnapshots(edit, live));
});
for (const name of [
  "jcr:title",
  "description",
  "j:url",
  "j:defaultCategory",
  "j:invalidLanguages",
]) {
  test(`refuses a pending editorial change in ${name}`, () => {
    const edit = pair(),
      live = pair();
    edit[0].properties = edit[0].properties.filter((p) => p.name !== name);
    live[0].properties = live[0].properties.filter((p) => p.name !== name);
    edit[0].properties.push(prop(name, "draft"));
    live[0].properties.push(prop(name, "published"));
    assert.throws(() => validateSnapshots(edit, live), /Draft differs/);
  });
}
test("preserves partial language unpublication and node identity", () => {
  const edit = pair(),
    live = pair();
  edit[0].properties.push(prop("j:published", "false"));
  assert.throws(() => validateSnapshots(edit, live), /Partially unpublished/);
  assert.throws(() => validateSnapshots(pair(), [{ ...pair()[0], uuid: "other" }]), /identity/);
  assert.throws(() => validateSnapshots(pair(), []), /structure/);
});
test("only the LIVE bookkeeping mixin can differ", () => {
  const edit = pair(),
    live = pair();
  edit[0].properties.push({ name: "jcr:mixinTypes", value: null, values: ["mix:title"] });
  live[0].properties.push({
    name: "jcr:mixinTypes",
    value: null,
    values: ["jmix:liveProperties", "mix:title"],
  });
  assert.doesNotThrow(() => validateSnapshots(edit, live));
  live[0].properties.at(-1).values.push("jmix:nolive");
  assert.throws(() => validateSnapshots(edit, live), /Draft differs/);
});
test("a failed unpublication of vanity mappings does not prevent repair of the content", () => {
  const edit = pair(),
    live = pair();
  for (const nodes of [edit, live]) {
    nodes[0].path += "/vanityUrlMapping";
    nodes[0].properties.push(prop("j:published", "false"));
  }
  assert.doesNotThrow(() => validateSnapshots(edit, live));
});
test("an otherwise empty LIVE mixin list is equivalent to no mixins", () => {
  const edit = pair(),
    live = pair();
  live[0].properties.push({ name: "jcr:mixinTypes", value: null, values: ["jmix:liveProperties"] });
  assert.doesNotThrow(() => validateSnapshots(edit, live));
});

test("dry-run makes no mutation and refuses draft changes even with --apply", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jahia-publication-test-"));
  let draftChanged = false;
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { query } = JSON.parse(body);
    requests.push(query);
    const path = JSON.parse(query.match(/path:("[^"]+")/)[1]);
    const isLive = query.includes("workspace:LIVE");
    const value = {
      uuid: path,
      path,
      translationLanguages: ["en", "fr"],
      properties: [prop("jcr:title", draftChanged && !isLive ? "draft" : "published")],
      children: { nodes: [] },
    };
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ data: { jcr: { nodeByPath: value } } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const args = [
    "--base-url",
    `http://127.0.0.1:${server.address().port}`,
    "--paths",
    "/sites/example/contents/item",
    "--languages",
    "en,fr",
  ];
  try {
    await main(args, { JAHIA_AUTHORIZATION: "Basic local-test" });
    draftChanged = true;
    await assert.rejects(main(args, { JAHIA_AUTHORIZATION: "Basic local-test" }), /Draft differs/);
    for (const option of ["--apply", "--unpublish", "--backup-dir"]) {
      const count = requests.length;
      await assert.rejects(
        main([...args, option, directory], { JAHIA_AUTHORIZATION: "Basic local-test" }),
        /Read-only diagnostic/,
      );
      assert.equal(requests.length, count, "legacy mutation options must fail before any request");
    }
    assert.ok(requests.length > 0);
    assert.ok(requests.every((query) => !query.startsWith("mutation")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("requires HTTPS off loopback before transmitting credentials", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: String(url), options });
    throw Error("MOCK_REQUEST_ONLY");
  });
  const args = (origin) => [
    "--base-url",
    origin,
    "--paths",
    "/sites/example/contents/item",
    "--languages",
    "en",
  ];
  for (const origin of [
    "http://example.com",
    "http://10.0.0.1",
    "http://localhost.example.com",
    "http://[::2]",
  ]) {
    await assert.rejects(
      main(args(origin), { JAHIA_AUTHORIZATION: "Basic synthetic" }),
      /HTTPS is required/,
    );
  }
  assert.equal(requests.length, 0);
  for (const origin of [
    "http://localhost",
    "http://127.0.0.1",
    "http://[::1]",
    "https://example.com",
  ]) {
    await assert.rejects(
      main(args(origin), { JAHIA_AUTHORIZATION: "Basic synthetic" }),
      /MOCK_REQUEST_ONLY/,
    );
  }
  assert.equal(requests.length, 4);
  assert.ok(requests.every(({ options }) => options.redirect === "error"));
});

test("concurrent changes cannot reach a publish operation because mutation flags are disabled", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", () => {
    requests++;
    throw Error("must not make a request");
  });
  await assert.rejects(
    main(
      [
        "--base-url",
        "https://example.com",
        "--paths",
        "/sites/example/contents/item",
        "--languages",
        "en",
        "--apply",
        "--unpublish",
        "--backup-dir",
        "unused",
      ],
      { JAHIA_AUTHORIZATION: "Basic synthetic" },
    ),
    /Read-only diagnostic/,
  );
  assert.equal(requests, 0);
});
test("rejects overlapping roots, missing authorization and embedded credentials", async () => {
  await assert.rejects(
    main(["--base-url", "http://user:password@localhost:8081"], {}),
    /without credentials/,
  );
  await assert.rejects(
    main(
      [
        "--base-url",
        "http://localhost:8081",
        "--paths",
        "/sites/a/contents/x,/sites/a/contents/x/y",
      ],
      {},
    ),
    /overlapping/,
  );
  await assert.rejects(
    main(["--base-url", "http://localhost:8081", "--paths", "/sites/a/contents/x"], {}),
    /JAHIA_AUTHORIZATION/,
  );
});
