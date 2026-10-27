// Opt-in integration test. Creates and deletes ONLY a uniquely named localhost fixture.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const origin = new URL(process.env.JAHIA_TEST_ORIGIN || "http://localhost:8081");
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw Error("Integration tests only support a localhost origin");
const site = process.env.JAHIA_TEST_SITE;
if (!site || !/^[\w-]+$/.test(site))
  throw Error("Set JAHIA_TEST_SITE to the actual local site key");
const authorization = process.env.JAHIA_AUTHORIZATION;
if (!authorization) throw Error("Set JAHIA_AUTHORIZATION in this process");
async function query(query) {
  const response = await fetch(new URL("/modules/graphql", origin), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(60000),
    headers: {
      "Authorization": authorization,
      "Origin": origin.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw Error(`GraphQL HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors) throw Error(JSON.stringify(result.errors));
  return result.data;
}
const name = "publication-regression-" + randomUUID();
const nativeMode = process.argv.includes("--native");
if (!nativeMode) throw Error("Use --native: the maintenance diagnostic is now read-only");
const nativeBundle = process.env.JAHIA_TEST_NATIVE_BUNDLE || "";
if (
  nativeBundle &&
  !/^\/tmp\/jahiacom-publication-(?:integrity-[\w.-]+\.jar|probe-[\w.-]+\.tgz)$/.test(nativeBundle)
)
  throw Error("Use an explicit temporary local native bundle path");
const path = `/sites/${site}/contents/${name}`;
const quote = JSON.stringify;
const mutation = (operation, live = false, p = path) =>
  query(
    `mutation{jcr${live ? "(workspace:LIVE)" : ""}{mutateNode(pathOrId:${quote(p)}){${operation}}}}`,
  );
const anonymous = (language) =>
  fetch(new URL(`/cms/render/live/${language}${path}.html`, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
let created = false;
const nativeKey = "jahiacom-publication-test-" + name;
async function consoleScript(script) {
  const endpoint = new URL("/modules/tools/groovyConsole.jsp", origin);
  const page = await fetch(endpoint, {
    headers: { Authorization: authorization },
    redirect: "error",
  });
  const html = await page.text();
  const token = html.match(/name="toolAccessToken" value="([^"]+)"/)?.[1];
  assert.ok(token, "local Groovy token unavailable");
  const cookie = page.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "error",
    headers: {
      "Authorization": authorization,
      "Cookie": cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      toolAccessToken: token,
      runScript: "true",
      script: script + '\nprintln("NATIVE_TEST_OK")',
    }),
  });
  const output = (await response.text()).match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1] || "";
  assert.ok(output.includes("NATIVE_TEST_OK"), output.slice(0, 3000));
}
try {
  await query(`mutation{jcr{addNode(parentPathOrId:${quote(path.slice(0, path.lastIndexOf("/")))},name:${quote(name)},primaryNodeType:"jahiacom:partner",properties:[
    {name:"jcr:title",value:"Disposable publication test",language:"en"},
    {name:"jcr:title",value:"Test temporaire publication",language:"fr"},
    {name:"description",value:"<p>Disposable fixture</p>",language:"en"},
    {name:"description",value:"<p>Test temporaire</p>",language:"fr"}
  ]){uuid}}}`);
  created = true;
  await mutation('publish(languages:["en","fr"],publishSubNodes:true,includeSubTree:true)');
  let published = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await query(
      `{jcr{nodeByPath(path:${quote(path)}){properties(names:["j:published"]){name value}}}}`,
    );
    if (result.jcr.nodeByPath.properties.some((p) => p.value === "true")) {
      published = true;
      break;
    }
    await delay(500);
  }
  assert.ok(published, "initial fixture publication timed out");
  if (nativeMode)
    await consoleScript(`
def context=org.jahia.osgi.FrameworkService.bundleContext
def type='org.jahia.modules.publicationintegrity.PublicationIntegrity'
if(${quote(nativeBundle)}.endsWith('.tgz')) assert !context.getServiceReferences(type,null) : 'Isolated package test requires no other installed publication guard'
if(!context.getServiceReferences(type,null)) {
  assert ${quote(nativeBundle)} : 'Install the native guard locally or set JAHIA_TEST_NATIVE_BUNDLE'
  def source=new File(${quote(nativeBundle)}).toURI().toString()
  def bundle=context.installBundle(${quote(nativeBundle)}.endsWith('.tgz')?'js://'+source:source)
  System.setProperty(${quote(nativeKey)},Long.toString(bundle.bundleId))
  bundle.start()
}
for(int i=0;i<60&&!context.getServiceReferences(type,null);i++) Thread.sleep(500)
assert context.getServiceReferences(type,null) : 'Native integrity component did not activate'
def ownId=System.getProperty(${quote(nativeKey)})
if(ownId && ${quote(nativeBundle)}.endsWith('.tgz')) {
  def bundle=context.getBundle(Long.parseLong(ownId))
  assert bundle.symbolicName == 'jahiacom-publication-probe' : 'Package identity was overwritten by native manifest'
  bundle.stop()
  assert !context.getServiceReferences(type,null) : 'Integrity component survived package stop'
  bundle.start()
  for(int i=0;i<60&&!context.getServiceReferences(type,null);i++) Thread.sleep(500)
  assert context.getServiceReferences(type,null) : 'Single-package component did not survive restart'
}
`);
  await mutation(
    'setPropertiesBatch(properties:[{name:"j:lastPublished",type:DATE,value:"2020-01-01T00:00:00.000Z"}]){__typename}',
    true,
  );
  for (const live of [false, true])
    for (const language of ["en", "fr"])
      await mutation(
        `deletePropertiesBatch(properties:[{name:"j:published",language:"${language}"}])`,
        live,
        `${path}/j:translation_${language}`,
      );
  if (nativeMode) {
    // Keep an unapproved draft different from LIVE: automatic repair must NOT publish it.
    await mutation(
      'setPropertiesBatch(properties:[{name:"description",language:"en",value:"<p>UNAPPROVED DRAFT</p>"}]){__typename}',
    );
    const waitForNative = async () => {
      for (let i = 0; i < 60; i++) {
        const value = await query(
          `{jcr(workspace:LIVE){nodeByPath(path:${quote(path)}){properties(names:["j:liveProperties"]){name values}en:descendant(relPath:"j:translation_en"){property(name:"j:published"){value}}}}}`,
        );
        const node = value.jcr.nodeByPath;
        if (
          !node.properties.some((p) => p.values?.includes("j:lastPublished")) &&
          node.en.property?.value === "true"
        )
          return;
        await delay(500);
      }
      throw Error("Native listeners did not repair imported bookkeeping");
    };
    if (nativeMode) {
      await waitForNative();
      // A second corrupt import AFTER the initial scan must repair itself via events.
      await mutation(
        'setPropertiesBatch(properties:[{name:"j:lastPublished",type:DATE,value:"2020-01-01T00:00:00.000Z"}]){__typename}',
        true,
      );
      await waitForNative();
    }
    const values = await query(
      `{jcr{nodeByPath(path:${quote(path)}){property(name:"description",language:"en"){value} info:aggregatedPublicationInfo(language:"en"){publicationStatus}}} live:jcr(workspace:LIVE){nodeByPath(path:${quote(path)}){property(name:"description",language:"en"){value}}}}`,
    );
    assert.equal(values.jcr.nodeByPath.property.value, "<p>UNAPPROVED DRAFT</p>");
    assert.equal(values.live.nodeByPath.property.value, "<p>Disposable fixture</p>");
    assert.equal(values.jcr.nodeByPath.info.publicationStatus, "MODIFIED");
    console.log(
      "Native guard LIVE metadata",
      JSON.stringify(
        await query(
          `{jcr(workspace:LIVE){nodeByPath(path:${quote(path)}){properties(names:["j:published","j:lastPublished","jcr:lastModified","j:liveProperties"]){name value values}}}}`,
        ),
      ),
    );
    await mutation('unpublish(languages:["en","fr"])');
    console.log(
      "After native unpublish",
      JSON.stringify(
        await query(
          `{jcr{nodeByPath(path:${quote(path)}){properties(names:["j:published"]){name value}info:aggregatedPublicationInfo(language:"en"){publicationStatus}}}}`,
        ),
      ),
    );
    await delay(2500); // Let the event worker run again: never reactivate the unpublished root.
  }
  for (const language of ["en", "fr"]) assert.equal((await anonymous(language)).status, 404);
  console.log(
    "PASS: actual OSGi bundle, two automatic repairs, draft preserved, native FR/EN unpublish gives 404 without reactivation",
  );
} finally {
  if (nativeMode)
    await consoleScript(
      `def id=System.clearProperty(${quote(nativeKey)});if(id){def bundle=org.jahia.osgi.FrameworkService.bundleContext.getBundle(Long.parseLong(id));if(bundle&&bundle.state!=org.osgi.framework.Bundle.UNINSTALLED)bundle.uninstall()}`,
    );
  if (created) {
    await query(`mutation{jcr{deleteNode(pathOrId:${quote(path)})}}`);
    await query(`mutation{jcr(workspace:LIVE){deleteNode(pathOrId:${quote(path)})}}`);
  }
}
