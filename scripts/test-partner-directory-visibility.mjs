import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isExplicitlyUnpublished,
  visibleInDirectory,
} from "../src/views/PartnerDirectory/visibility.server.ts";

const node = (root, translations = { fr: true, en: true }) => ({
  hasProperty: () => root !== undefined,
  getProperty: () => ({ getBoolean: () => root }),
  hasI18N: (locale, fallback) => {
    assert.equal(fallback, false);
    return Object.hasOwn(translations, locale);
  },
  getI18N: (locale, fallback) => {
    assert.equal(fallback, false);
    return {
      hasProperty: () => translations[locale] !== undefined,
      getProperty: () => ({ getBoolean: () => translations[locale] }),
    };
  },
});

test("an unpublished partner disappears from preview but remains editable", () => {
  const partner = node(false, { fr: false, en: false });
  assert.equal(visibleInDirectory(partner, "fr", false), false);
  assert.equal(visibleInDirectory(partner, "fr", true), true);
});

test("partial unpublication only hides the affected language", () => {
  const partner = node(true, { fr: false, en: true });
  assert.equal(visibleInDirectory(partner, "fr", false), false);
  assert.equal(visibleInDirectory(partner, "en", false), true);
});

test("republishing restores preview visibility without changing the filter", () => {
  const languages = { fr: false, en: true };
  const partner = node(true, languages);
  assert.equal(visibleInDirectory(partner, "fr", false), false);
  languages.fr = true;
  assert.equal(visibleInDirectory(partner, "fr", false), true);
});

test("new drafts and legacy imports without explicit false markers remain previewable", () => {
  assert.equal(visibleInDirectory(node(undefined, { fr: undefined }), "fr", false), true);
});

test("missing translations are not replaced by another published language", () => {
  assert.equal(visibleInDirectory(node(true, { en: true }), "fr", false), false);
});

test("the editor badge follows explicit unpublication in the displayed language", () => {
  assert.equal(isExplicitlyUnpublished(node(true, { fr: false, en: true }), "fr"), true);
  assert.equal(isExplicitlyUnpublished(node(true, { fr: false, en: true }), "en"), false);
  assert.equal(isExplicitlyUnpublished(node(false), "en"), true);
});

test("new drafts and missing translations are not labelled as unpublished", () => {
  assert.equal(isExplicitlyUnpublished(node(undefined, { fr: undefined }), "fr"), false);
  assert.equal(isExplicitlyUnpublished(node(true, { en: true }), "fr"), false);
});
