"use strict";

/*
  Background Playback Helper - Content Script

  Architecture:
  - visibility-main.js runs in MAIN world at document_start
  - content.js (this file) runs in ISOLATED world at document_start

  The manifest specifies run_at: "document_start" for both scripts.
  visibility-main.js is listed first in manifest, so it runs first.
*/

// Frame bail: avoid running in iframes.
if (window.top !== window) {
  // Do nothing in iframes
} else {
  const SITES = ["youtube.com", "youtube-nocookie.com", "vimeo.com"];

  const DEFAULTS = {
    enabled: true,
    enableFix: true,
    enableKeepAlive: true,
    keepAliveMethod: "keyboard", // keyboard | mouse | alternate
    autoDismissDialogs: true,
    debug: false,
  };

  function getApi() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  const api = getApi();
  const storageLocal = api && api.storage && api.storage.local ? api.storage.local : null;

  function hostnameMatches(hostname, site) {
    return hostname === site || hostname.endsWith("." + site);
  }

  function isSupportedSite() {
    const h = window.location.hostname || "";
    return SITES.some((site) => hostnameMatches(h, site));
  }

  function normalizeMethod(value) {
    if (value === "mouse") return "mouse";
    if (value === "alternate") return "alternate";
    return "keyboard";
  }

  function normalizeBool(value, defaultValue) {
    if (value === true) return true;
    if (value === false) return false;
    return defaultValue;
  }

  // Set attribute with fallback for early document_start when documentElement may not exist
  function setAttr(name, value) {
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute(name, value);
      }
    } catch {}
  }

  function applyBridges(settings) {
    setAttr("data-bg-play-enabled", settings.enabled ? "true" : "false");
    setAttr("data-bg-play-fix", settings.enableFix ? "true" : "false");
    setAttr("data-bg-play-keepalive", settings.enableKeepAlive ? "true" : "false");
    setAttr("data-bg-play-method", normalizeMethod(settings.keepAliveMethod));
    setAttr("data-bg-play-autodismiss", settings.autoDismissDialogs ? "true" : "false");
    setAttr("data-bg-play-debug", settings.debug ? "true" : "false");
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!storageLocal || typeof storageLocal.get !== "function") return resolve({});
      try {
        if (storageLocal.get.length >= 2) {
          storageLocal.get(keys, (res) => resolve(res || {}));
        } else {
          const p = storageLocal.get(keys);
          if (p && typeof p.then === "function")
            p.then((res) => resolve(res || {})).catch(() => resolve({}));
          else resolve({});
        }
      } catch {
        resolve({});
      }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      if (!storageLocal || typeof storageLocal.set !== "function") return resolve();
      try {
        if (storageLocal.set.length >= 2) {
          storageLocal.set(obj, () => resolve());
        } else {
          const p = storageLocal.set(obj);
          if (p && typeof p.then === "function")
            p.then(() => resolve()).catch(() => resolve());
          else resolve();
        }
      } catch {
        resolve();
      }
    });
  }

  function onStorageChanged(handler) {
    if (!api || !api.storage || !api.storage.onChanged) return;
    try {
      api.storage.onChanged.addListener(handler);
    } catch {}
  }

  let current = { ...DEFAULTS };

  function normalizeState(partial) {
    const out = { ...current, ...partial };
    out.enabled = normalizeBool(out.enabled, true);
    out.enableFix = normalizeBool(out.enableFix, true);
    out.enableKeepAlive = normalizeBool(out.enableKeepAlive, true);
    out.keepAliveMethod = normalizeMethod(out.keepAliveMethod);
    out.autoDismissDialogs = normalizeBool(out.autoDismissDialogs, true);
    out.debug = normalizeBool(out.debug, false);
    return out;
  }

  async function initStorage() {
    // Apply defaults immediately (synchronous)
    applyBridges(current);

    // Load persisted settings (async)
    const res = await storageGet(Object.keys(DEFAULTS));
    current = normalizeState(res);

    // Persist normalized state
    await storageSet({
      enabled: current.enabled,
      enableFix: current.enableFix,
      enableKeepAlive: current.enableKeepAlive,
      keepAliveMethod: current.keepAliveMethod,
      autoDismissDialogs: current.autoDismissDialogs,
      debug: current.debug,
    });

    // Apply loaded settings
    applyBridges(current);

    // Listen for changes from popup
    onStorageChanged((changes, areaName) => {
      if (areaName !== "local") return;

      const patch = {};
      for (const k of Object.keys(DEFAULTS)) {
        if (changes[k]) patch[k] = changes[k].newValue;
      }

      current = normalizeState(patch);
      applyBridges(current);
    });
  }

  if (isSupportedSite()) {
    // Apply bridges synchronously FIRST with defaults
    applyBridges(current);

    // Then do async storage init to load persisted settings
    initStorage().catch(() => {
      // On error, bridges already applied with defaults
    });
  }
}