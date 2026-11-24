import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHubspotEmbed } from "../src/views/Authors/hubspotEmbed.ts";

const portalId = "1234567";
const formId = "01234567-89ab-cdef-0123-456789abcdef";
const legacyScript = "//js-eu1.hsforms.net/forms/embed/v2.js";
const currentScript = "https://js-eu1.hsforms.net/forms/embed/" + portalId + ".js";

const legacy =
  '<script src="' +
  legacyScript +
  '"></script><script>hbspt.forms.create({portalId:"' +
  portalId +
  '",formId:"' +
  formId +
  '"});</script>';

const current =
  '<script src="' +
  currentScript +
  '" defer></script><div class="hs-form-frame" data-region="eu1" data-form-id="' +
  formId +
  '" data-portal-id="' +
  portalId +
  '"></div>';

test("gets an EU legacy form from rich text even when region is omitted", () => {
  assert.deepEqual(parseHubspotEmbed("<p>Contact us</p><div>" + legacy + "</div>"), {
    portalId,
    formId,
    region: "eu1",
    format: "legacy",
    scriptUrl: "https:" + legacyScript,
  });
});

test("gets the current HubSpot form from rich text", () => {
  assert.deepEqual(parseHubspotEmbed(current), {
    portalId,
    formId,
    region: "eu1",
    format: "current",
    scriptUrl: currentScript,
  });
});

test("rejects scripts from other hosts, mismatched portals and executable extras", () => {
  assert.equal(
    parseHubspotEmbed(current.replace("hsforms.net", "hsforms.net.example.com")),
    undefined,
  );
  assert.equal(parseHubspotEmbed(current.replace(portalId + ".js", "42.js")), undefined);
  assert.equal(parseHubspotEmbed(legacy.replace(");</script>", ");alert(1);</script>")), undefined);
  assert.equal(parseHubspotEmbed("<template>" + current + "</template>"), undefined);
  assert.equal(parseHubspotEmbed(formId), undefined);
});
