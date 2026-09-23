"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var path = require("node:path");
var fs = require("node:fs");
var vm = require("node:vm");
var { createChromeMock } = require("./chrome-mock.js");

function loadQueueStorage() {
  var mock = createChromeMock();
  var code = fs.readFileSync(path.join(__dirname, "..", "storage.js"), "utf8");
  var sandbox = {
    chrome: global.chrome,
    console: console,
    URL: URL,
    Promise: Promise,
    Object: Object,
    Array: Array,
    Math: Math,
    Date: Date,
    Number: Number,
    String: String,
    Boolean: Boolean,
    isFinite: isFinite,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: "storage.js" });
  return { QueueStorage: sandbox.QueueStorage, mock: mock };
}

test("normalizeUrl strips tracking params", function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  var cleaned = QueueStorage.normalizeUrl(
    "https://www.youtube.com/watch?v=abc123&si=sharetoken&utm_source=twitter"
  );
  assert.equal(cleaned, "https://www.youtube.com/watch?v=abc123");
});

test("addItem de-duplicates by normalized URL", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  var first = await QueueStorage.addItem({
    url: "https://example.com/v?utm_source=x",
    title: "One"
  });
  var second = await QueueStorage.addItem({
    url: "https://example.com/v?utm_medium=y",
    title: "Two"
  });
  assert.equal(first.alreadyExisted, false);
  assert.equal(second.alreadyExisted, true);
  assert.equal(first.item.id, second.item.id);
  var items = await QueueStorage.getItems();
  assert.equal(items.length, 1);
});

test("addItem advances resume position but never regresses it", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  await QueueStorage.addItem({
    url: "https://example.com/a",
    title: "A",
    position: 30,
    duration: 100
  });
  await QueueStorage.addItem({
    url: "https://example.com/a",
    title: "A",
    position: 50,
    duration: 100
  });
  var mid = await QueueStorage.getItems();
  assert.equal(mid[0].position, 50);

  await QueueStorage.addItem({
    url: "https://example.com/a",
    title: "A",
    position: 20,
    duration: 100
  });
  var end = await QueueStorage.getItems();
  assert.equal(end[0].position, 50);
});

test("updatePositionByUrl is a no-op for unsaved URLs", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  var result = await QueueStorage.updatePositionByUrl("https://example.com/none", 10, 60);
  assert.equal(result, null);
});

test("setSettings clamps delay and rejects invalid enums", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  var s = await QueueStorage.setSettings({
    popupDelaySeconds: 999,
    theme: "neon",
    listSort: "wat",
    listFilter: "maybe"
  });
  assert.equal(s.popupDelaySeconds, 180);
  assert.equal(s.theme, "system");
  assert.equal(s.listSort, "newest");
  assert.equal(s.listFilter, "all");

  var low = await QueueStorage.setSettings({ popupDelaySeconds: 1 });
  assert.equal(low.popupDelaySeconds, 5);
});

test("importItems preserves notes/position and export order", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  await QueueStorage.addItem({ url: "https://example.com/existing", title: "Keep" });

  var result = await QueueStorage.importItems([
    {
      url: "https://example.com/new-a?utm_source=x",
      title: "A",
      note: "watch later for talk",
      position: 42,
      duration: 300,
      watched: true
    },
    {
      url: "https://example.com/new-b",
      title: "B",
      note: ""
    },
    {
      url: "https://example.com/existing?si=dup",
      title: "Should skip"
    }
  ]);

  assert.equal(result.added, 2);
  assert.equal(result.total, 3);
  var items = await QueueStorage.getItems();
  assert.equal(items[0].title, "A");
  assert.equal(items[0].note, "watch later for talk");
  assert.equal(items[0].position, 42);
  assert.equal(items[0].duration, 300);
  assert.equal(items[0].watched, true);
  assert.equal(items[1].title, "B");
  assert.equal(items[2].title, "Keep");
});

test("importItems rejects non-arrays", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  await assert.rejects(function () {
    return QueueStorage.importItems({ not: "an array" });
  });
});

test("getItems backfills missing note/position fields", async function () {
  var { QueueStorage, mock } = loadQueueStorage();
  mock.clear();
  mock.store.queue_items = [{
    id: "q_old",
    url: "https://example.com/legacy",
    normalizedUrl: "https://example.com/legacy",
    title: "Legacy",
    addedAt: 1,
    watched: false
  }];
  var items = await QueueStorage.getItems();
  assert.equal(items[0].note, "");
  assert.equal(items[0].position, 0);
  assert.equal(items[0].duration, 0);
  assert.equal(items[0].thumbnail, "");
});
