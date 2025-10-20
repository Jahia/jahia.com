#!/usr/bin/env node
// Fork of https://github.com/Jahia/javascript-modules/blob/f83383c9968a5c1a188c046ee14167c7e37e6d06/vite-plugin/bin/jahia-deploy.js
// to support arbitrary authentication
import * as fs from "node:fs";
import { inspect, styleText } from "node:util";

// Prepare the payload for the provisioning API
// https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/dev-ops/provisioning/provisioning-commands
const body = new FormData();
body.append(
  "script",
  JSON.stringify([
    {
      installOrUpgradeBundle: "package.tgz",
      ignoreChecks: true,
    },
  ]),
);
body.append("file", new File([fs.readFileSync("./dist/package.tgz")], "package.tgz"));

// Send the payload to the Jahia provisioning API
console.log("Deploying the package to Jahia...");
const response = await fetch(new URL("/modules/api/provisioning", process.env.JAHIA_HOST), {
  method: "POST",
  headers: {
    Authorization: process.env.JAHIA_AUTHORIZATION,
  },
  body,
});

if (!response.ok) {
  console.error(styleText("red", "%d: %s"), response.status, response.statusText);
  console.error(styleText("red", await response.text()));
  process.exit(1);
}

const data = await response.json();
console.log(inspect(data, { depth: Infinity, colors: true }));
