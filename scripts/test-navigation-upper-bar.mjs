import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedUpperBar,
  validateUpperBar,
  projectUpperBar,
  upperBarUrl,
} from "../javascript/navigation/upperBar.js";
import { validateSettings, decodeSettings, emptySection } from "../javascript/navigation/model.js";
import { changeUpperBar } from "../javascript/navigation/upperBarEditor.js";
const legacy = () => ({
  native: {
    "jcr:mixinTypes": ["jahiacommix:homeUtilityNavigation", "jahiacommix:homeNavbarButtons"],
    "utilityItemsData": JSON.stringify([
      {
        kind: "external",
        url: "https://www.jahia.com/community",
        labels: { fr: "Communauté", en: "Community" },
      },
      { kind: "languages" },
      { kind: "internal", id: "support" },
      { kind: "search" },
    ]),
    "utilityLanguagesVisible": "false",
    "primaryCTAStyle": "primary",
    "primaryCTAPlacement": "upper",
    "secondaryCTAStyle": "secondary",
    "navbarCTAOrder": "demoContact",
  },
  fr: {
    primaryCTALink: "demo-fr",
    primaryCTALabel: "Démo",
    secondaryCTALink: "contact-fr",
    utilitySearchLabel: "Trouver",
  },
  en: { primaryCTALink: "demo-en", primaryCTALabel: "Demo", secondaryCTALink: "contact-en" },
});
const blank = { native: {}, fr: {}, en: {} };
const settings = () => ({ version: 1, mode: "automatic", sections: { product: emptySection() } });
test("existing upper settings seed without mutating native values or activating an override", () => {
  const home = legacy(),
    before = structuredClone(home),
    config = seedUpperBar(home, blank);
  validateUpperBar(config);
  assert.deepEqual(
    config.items.map((item) => item.kind),
    ["external", "languages", "internal", "search"],
  );
  assert.equal(config.items[1].visible, false);
  assert.equal(config.items[3].labels.fr, "Trouver");
  assert.deepEqual(
    config.buttons.map((b) => b.key),
    ["demo", "contact"],
  );
  assert.deepEqual(config.buttons[0].targets, { fr: "demo-fr", en: "demo-en" });
  assert.equal(config.buttons[0].placement, "upper");
  assert.deepEqual(home, before);
  assert.equal(decodeSettings(JSON.stringify(settings())).upperBar, undefined);
});
test("legacy utility ordering, site fallback and RSS address are preserved", () => {
  const site = {
    native: {
      utilityNavigationLinks: ["support", "login"],
      utilityLanguagesPosition: "1",
      utilityLinksPosition: "2",
      utilitySearchPosition: "4",
      utilityRssPosition: "3",
    },
    fr: { primaryCTALink: "demo" },
    en: {},
  };
  const config = seedUpperBar(blank, site, { href: "/feed.xml" });
  assert.deepEqual(
    config.items.map((i) => i.kind),
    ["languages", "internal", "internal", "rss", "search"],
  );
  assert.equal(config.rss.url, "/feed.xml");
  assert.equal(config.buttons.find((b) => b.key === "demo").targets.fr, "demo");
});
test("projection respects order, per-language button targets, hidden tools and explicit removals", () => {
  const config = seedUpperBar(legacy(), blank),
    seen = [];
  const page = (id, label) => {
    seen.push(id);
    return id === "missing"
      ? undefined
      : { title: label || id, href: "/page/" + id, current: false };
  };
  const result = projectUpperBar(config, "fr", page);
  assert.deepEqual(
    result.utilityEntries.map((i) => i.kind || i.title),
    ["Communauté", "support", "search"],
  );
  assert.equal(result.controls.languagesVisible, false);
  assert.equal(result.controls.searchLabel, "Trouver");
  assert.equal(result.buttons[0].href, "/page/demo-fr");
  assert.equal(projectUpperBar(config, "en", page).buttons[0].href, "/page/demo-en");
  config.items = [];
  config.buttons.forEach((b) => {
    b.visible = false;
  });
  const empty = projectUpperBar(config, "fr", page);
  assert.deepEqual(empty.utilityEntries, []);
  assert.deepEqual(empty.buttons, []);
  assert.equal(empty.controls.searchVisible, false);
  assert.equal(empty.controls.languagesVisible, false);
  assert.equal(empty.rss, undefined);
});
test("upper configuration validates URLs, bounds, IDs, tools and translated targets", () => {
  for (const url of [
    "javascript:alert(1)",
    "//evil.example",
    "https://user:pass@example.com",
    "https://example.com\\evil",
    "https://example.com\npath",
    "data:text/html,x",
  ])
    assert.equal(upperBarUrl(url), undefined);
  assert.equal(upperBarUrl("/feed.xml", true), "/feed.xml");
  assert.equal(
    upperBarUrl("https://www.jahia.com/demo?q=test"),
    "https://www.jahia.com/demo?q=test",
  );
  const config = seedUpperBar(legacy(), blank);
  for (const change of [
    (c) => {
      c.items[0].url = "javascript:evil";
    },
    (c) => {
      c.buttons[0].targets.fr = "../../outside";
    },
    (c) => {
      c.items.push({ ...c.items[1], key: "duplicate" });
    },
    (c) => {
      c.items = Array(41).fill(c.items[0]);
    },
  ]) {
    const bad = structuredClone(config);
    change(bad);
    assert.throws(() => validateSettings({ ...settings(), upperBar: bad }));
  }
});
test("editing and reordering upper items preserves all section settings and keeps draft changes local", () => {
  const original = settings(),
    seed = seedUpperBar(legacy(), blank);
  const manager = {
    state: { settings: original, snapshot: { upperBar: seed } },
    text: () => ({ dirty: "dirty" }),
    setState(patch) {
      Object.assign(this.state, patch);
    },
  };
  changeUpperBar(manager, (next) => {
    [next.items[0], next.items[1]] = [next.items[1], next.items[0]];
    next.items[0].labels.fr = "Langues du site";
  });
  assert.equal(original.upperBar, undefined);
  assert.deepEqual(manager.state.settings.sections, original.sections);
  assert.equal(seed.items[0].kind, "external");
  assert.equal(manager.state.settings.upperBar.items[0].kind, "languages");
  assert.equal(manager.state.dirty, true);
  manager.state.busy = true;
  const before = structuredClone(manager.state.settings);
  changeUpperBar(manager, (c) => {
    c.items = [];
  });
  assert.deepEqual(manager.state.settings, before);
});
