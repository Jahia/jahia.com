#!/usr/bin/env node
// Fork of https://github.com/Jahia/javascript-modules/blob/f83383c9968a5c1a188c046ee14167c7e37e6d06/vite-plugin/bin/jahia-deploy.js
// to support arbitrary authentication
import * as fs from "node:fs";
import { styleText } from "node:util";

const body = new FormData();
body.append("bundle", new File([fs.readFileSync("./dist/package.tgz")], "package.tgz"));
body.append("ignoreChecks", "true");
body.append("start", "true");

const host = process.env.JAHIA_HOST || "http://localhost:8080";
const deploymentUrl = new URL("modules/api/bundles", host.endsWith("/") ? host : `${host}/`);
console.log(`Deploying the package to Jahia (${deploymentUrl})...`);
const response = await fetch(deploymentUrl, {
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

const result = await response.text();
console.log(`Response type: ${response.headers.get("content-type") || "unknown"}`);
console.log(result || styleText("green", "The module manager returned an empty success response."));
