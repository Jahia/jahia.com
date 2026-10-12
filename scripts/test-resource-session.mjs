import { test } from "node:test";
import assert from "node:assert/strict";

let sequence = 0;
const storage = new Map();
const setup = async (href = "https://example.test/fr/blog", blocked = false) => {
  let location = new URL(href);
  const historyState = { preserved: true };
  globalThis.window = {
    get location() {
      return location;
    },
    sessionStorage: {
      getItem(key) {
        if (blocked) throw new Error("blocked");
        return storage.get(key) || null;
      },
      setItem(key, value) {
        if (blocked) throw new Error("blocked");
        storage.set(key, value);
      },
    },
    history: {
      state: historyState,
      replaceState(state, _, url) {
        assert.equal(state, historyState);
        location = new URL(url, location);
      },
    },
  };
  return import(`../src/components/resourceSession.ts?test=${++sequence}`);
};

test("restores page and filters across a reload with a clean URL", async () => {
  storage.clear();
  let session = await setup();
  session.saveResourceState("blog", { page: 3, filters: { filter1: "cms" } });
  session = await setup();
  assert.deepEqual(session.readResourceState("blog"), { page: 3, filters: { filter1: "cms" } });
});

test("separates languages, pages and independent lists", async () => {
  storage.clear();
  const session = await setup();
  session.saveResourceState("blog", { page: 2 });
  assert.equal(session.readResourceState("other-list").page, 1);
  await setup("https://example.test/en/blog");
  assert.equal(session.readResourceState("blog").page, 1);
  await setup("https://example.test/fr/resources");
  assert.equal(session.readResourceState("blog").page, 1);
});

test("migrates old links then cleans only listing parameters, preserving anchors and tracking", async () => {
  storage.clear();
  const session = await setup(
    "https://example.test/fr/blog?blogPage=2&filter1=cms&filter2=ai&cluster=old&theme=old&utm_source=test#articles",
  );
  const restored = session.readResourceState("blog");
  assert.deepEqual(restored, { page: 2, filters: { filter1: "cms", filter2: "ai" } });
  session.saveResourceState("blog", restored);
  session.cleanResourceUrl();
  assert.equal(window.location.href, "https://example.test/fr/blog?utm_source=test#articles");
  session.saveResourceState("blog", { page: 1, filters: {} });
  assert.deepEqual(session.readResourceState("blog"), { page: 1, filters: {} });
});

test("ignores corrupt storage, invalid page numbers and unsupported filter fields", async () => {
  storage.clear();
  let session = await setup();
  storage.set(session.resourceStateKey("blog"), "{broken");
  assert.deepEqual(session.readResourceState("blog"), { page: 1, filters: {} });
  storage.set(
    session.resourceStateKey("blog"),
    JSON.stringify({ page: -4, filters: { filter1: "cms", filter2: 7, injected: "x" } }),
  );
  assert.deepEqual(session.readResourceState("blog"), { page: 1, filters: { filter1: "cms" } });
  for (const invalid of ["NaN", "-1", "0", "1.5", "99999999999999999999"]) {
    session = await setup(`https://example.test/fr/blog?blogPage=${invalid}`);
    assert.equal(session.readResourceState("blog").page, 1);
  }
});

test("keeps interactions working when sessionStorage access is blocked", async () => {
  storage.clear();
  const session = await setup("https://example.test/fr/blog", true);
  session.saveResourceState("blog", { page: 4, filters: { filter1: "cms" } });
  assert.deepEqual(session.readResourceState("blog"), { page: 4, filters: { filter1: "cms" } });
  session.cleanResourceUrl();
});

test("restores only current options and reset clears filters and returns to page one", async () => {
  storage.clear();
  const session = await setup();
  session.saveResourceState("blog", { page: 4, filters: { filter1: "removed", filter2: "ai" } });
  const selects = [
    { name: "filter1", value: "", options: [{ value: "" }, { value: "cms" }] },
    { name: "filter2", value: "", options: [{ value: "" }, { value: "ai" }] },
  ];
  const form = {
    querySelectorAll() {
      return selects;
    },
  };
  session.restoreResourceFilters(form, "blog");
  assert.equal(selects[0].value, "");
  assert.equal(selects[1].value, "ai");
  for (const select of selects) select.value = "";
  session.saveResourceFilters(form, "blog", true);
  assert.deepEqual(session.readResourceState("blog"), {
    page: 1,
    filters: { filter1: "", filter2: "" },
  });
});
