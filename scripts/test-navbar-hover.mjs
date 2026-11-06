import { test } from "node:test";
import assert from "node:assert/strict";
import { createHoverIntent } from "../src/templates/hoverIntent.ts";

test("brief crossings do not open a menu", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const changes = [];
  const intent = createHoverIntent((index) => changes.push(index));
  intent.schedule(1);
  t.mock.timers.tick(100);
  intent.schedule(null);
  t.mock.timers.tick(250);
  assert.deepEqual(changes, [null]);
});

test("a deliberate hover opens after 300ms and leaving closes after 250ms", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const changes = [];
  const intent = createHoverIntent((index) => changes.push(index));
  intent.schedule(1);
  t.mock.timers.tick(299);
  assert.deepEqual(changes, []);
  t.mock.timers.tick(1);
  intent.schedule(null);
  t.mock.timers.tick(249);
  assert.deepEqual(changes, [1]);
  t.mock.timers.tick(1);
  assert.deepEqual(changes, [1, null]);
});

test("switching sections cancels the stale pending opening", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const changes = [];
  const intent = createHoverIntent((index) => changes.push(index));
  intent.schedule(1);
  t.mock.timers.tick(150);
  intent.schedule(2);
  t.mock.timers.tick(300);
  assert.deepEqual(changes, [2]);
});

test("Escape, clicking and unmount cancellation prevent a delayed reopening", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const changes = [];
  const intent = createHoverIntent((index) => changes.push(index));
  intent.schedule(1);
  intent.cancel();
  t.mock.timers.tick(1000);
  assert.deepEqual(changes, []);
});

test("switching between already open categories takes only 100ms", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const changes = [];
  const intent = createHoverIntent((index) => changes.push(index));
  intent.schedule(1);
  t.mock.timers.tick(300);
  intent.schedule(2, true);
  t.mock.timers.tick(99);
  assert.deepEqual(changes, [1]);
  t.mock.timers.tick(1);
  assert.deepEqual(changes, [1, 2]);
});
