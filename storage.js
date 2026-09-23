/**
 * QueueStorage — thin wrapper around chrome.storage.local.
 * This is the ONLY place data is written or read. Everything lives on the
 * user's machine; nothing is ever sent anywhere. Loaded by the content
 * script, the popup, the options page and the background worker.
 */
var QueueStorage = (function () {
  "use strict";

  var KEYS = {
    ITEMS: "queue_items",
    SETTINGS: "queue_settings"
  };

  var DEFAULT_SETTINGS = {
    popupEnabled: true,
    popupDelaySeconds: 20,
    theme: "system", // "system" | "light" | "dark"
    listSort: "newest", // "newest" | "oldest" | "site"
    listFilter: "all" // "all" | "unwatched" | "watched"
  };

  function promisify(fn, arg) {
    return new Promise(function (resolve, reject) {
      fn(arg, function (result) {
        var err = chrome.runtime.lastError;
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  function get(keys) {
    return promisify(chrome.storage.local.get.bind(chrome.storage.local), keys);
  }

  function set(obj) {
    return promisify(chrome.storage.local.set.bind(chrome.storage.local), obj);
  }

  function generateId() {
    return "q_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  // Strip common tracking params so the same video saved twice from
  // different links (e.g. with a share ?si= token) is recognized as one item.
  var STRIP_PARAMS = [
    "si", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "feature", "fbclid", "gclid", "igshid", "spm"
  ];

  function normalizeUrl(rawUrl) {
    try {
      var u = new URL(rawUrl);
      STRIP_PARAMS.forEach(function (p) { u.searchParams.delete(p); });
      return u.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  function getSettings() {
    return get(KEYS.SETTINGS).then(function (res) {
      return Object.assign({}, DEFAULT_SETTINGS, res[KEYS.SETTINGS] || {});
    });
  }

  function setSettings(partial) {
    return getSettings().then(function (current) {
      var next = Object.assign({}, current, partial);
      return set({ [KEYS.SETTINGS]: next }).then(function () { return next; });
    });
  }

  function getItems() {
    return get(KEYS.ITEMS).then(function (res) { return res[KEYS.ITEMS] || []; });
  }

  function setItems(items) {
    return set({ [KEYS.ITEMS]: items });
  }

  // Returns { item, alreadyExisted }
  function addItem(partialItem) {
    return getItems().then(function (items) {
      var normalized = normalizeUrl(partialItem.url);
      var existingIndex = items.findIndex(function (it) { return it.normalizedUrl === normalized; });
      if (existingIndex !== -1) {
        var existing = items[existingIndex];
        var incomingPosition = partialItem.position || 0;
        // Re-saving an already-saved video (e.g. rewatching further in) can
        // still move the resume point forward, but never regresses it.
        if (incomingPosition > (existing.position || 0)) {
          existing = Object.assign({}, existing, {
            position: incomingPosition,
            duration: partialItem.duration || existing.duration || 0
          });
          items[existingIndex] = existing;
          return setItems(items).then(function () { return { item: existing, alreadyExisted: true }; });
        }
        return { item: existing, alreadyExisted: true };
      }
      var item = {
        id: generateId(),
        url: partialItem.url,
        normalizedUrl: normalized,
        title: (partialItem.title || partialItem.url || "Untitled").trim(),
        siteName: partialItem.siteName || "",
        thumbnail: partialItem.thumbnail || "",
        note: "",
        position: partialItem.position || 0,
        duration: partialItem.duration || 0,
        addedAt: Date.now(),
        watched: false
      };
      items.unshift(item);
      return setItems(items).then(function () { return { item: item, alreadyExisted: false }; });
    });
  }

  // Called periodically while a saved video plays, to keep its resume point
  // current. No-ops silently if the URL isn't saved. Never moves the
  // position backwards (a brief rewind shouldn't lose progress).
  function updatePositionByUrl(rawUrl, position, duration) {
    var normalized = normalizeUrl(rawUrl);
    return getItems().then(function (items) {
      var idx = items.findIndex(function (it) { return it.normalizedUrl === normalized; });
      if (idx === -1) return null;
      var current = items[idx];
      var nextPosition = Math.max(current.position || 0, position || 0);
      var nextDuration = duration || current.duration || 0;
      if (nextPosition === (current.position || 0) && nextDuration === (current.duration || 0)) {
        return current;
      }
      items[idx] = Object.assign({}, current, { position: nextPosition, duration: nextDuration });
      return setItems(items).then(function () { return items[idx]; });
    });
  }

  function removeItem(id) {
    return getItems().then(function (items) {
      var next = items.filter(function (it) { return it.id !== id; });
      return setItems(next);
    });
  }

  function updateItem(id, patch) {
    return getItems().then(function (items) {
      var next = items.map(function (it) {
        return it.id === id ? Object.assign({}, it, patch) : it;
      });
      return setItems(next);
    });
  }

  function clearAll() {
    return setItems([]);
  }

  function hasUrl(rawUrl) {
    var normalized = normalizeUrl(rawUrl);
    return getItems().then(function (items) {
      return items.some(function (it) { return it.normalizedUrl === normalized; });
    });
  }

  return {
    KEYS: KEYS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getSettings: getSettings,
    setSettings: setSettings,
    getItems: getItems,
    setItems: setItems,
    addItem: addItem,
    updatePositionByUrl: updatePositionByUrl,
    removeItem: removeItem,
    updateItem: updateItem,
    clearAll: clearAll,
    normalizeUrl: normalizeUrl,
    hasUrl: hasUrl
  };
})();

// Service workers (background.js) load this via importScripts and don't have
// a `window`; guard the export so both environments are happy.
if (typeof self !== "undefined") {
  self.QueueStorage = QueueStorage;
}
