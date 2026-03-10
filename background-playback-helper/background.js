"use strict";

const SITES = ["youtube.com", "youtube-nocookie.com", "vimeo.com"];

const ICONS = {
  DEFAULT: {
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  ACTIVE: {
    48: "icons/icon48_on.png",
    128: "icons/icon128_on.png",
  },
};

let enabledCached = true;

function getHostname(url) {
  try {
    return new URL(url).hostname || "";
  } catch {
    return "";
  }
}

function hostnameMatches(hostname, site) {
  return hostname === site || hostname.endsWith(`.${site}`);
}

function isSupportedUrl(url) {
  const hostname = getHostname(url);
  if (!hostname) return false;
  return SITES.some((site) => hostnameMatches(hostname, site));
}

function setOnBadge(tabId) {
  browser.action.setBadgeText({ text: "ON", tabId });

  if (browser.action.setBadgeBackgroundColor) {
    browser.action.setBadgeBackgroundColor({ color: "#4caf50", tabId });
  }
  if (browser.action.setBadgeTextColor) {
    browser.action.setBadgeTextColor({ color: "#ffffff", tabId });
  }
}

function setOffBadge(tabId) {
  browser.action.setBadgeText({ text: "OFF", tabId });

  if (browser.action.setBadgeBackgroundColor) {
    browser.action.setBadgeBackgroundColor({ color: "#6b7280", tabId });
  }
  if (browser.action.setBadgeTextColor) {
    browser.action.setBadgeTextColor({ color: "#ffffff", tabId });
  }
}

function clearBadge(tabId) {
  browser.action.setBadgeText({ text: "", tabId });
}

function resetActionState(tabId) {
  browser.action.setIcon({ path: ICONS.DEFAULT, tabId });
  clearBadge(tabId);
}

function updateState(tabId, url) {
  if (typeof tabId !== "number") return;

  if (!url) {
    resetActionState(tabId);
    return;
  }

  const isMatch = isSupportedUrl(url);

  if (!isMatch) {
    resetActionState(tabId);
    return;
  }

  if (enabledCached) {
    browser.action.setIcon({ path: ICONS.ACTIVE, tabId });
    setOnBadge(tabId);
  } else {
    browser.action.setIcon({ path: ICONS.DEFAULT, tabId });
    setOffBadge(tabId);
  }
}

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (typeof tabId !== "number") return;

  if (changeInfo.url || changeInfo.status === "complete") {
    updateState(tabId, tab.url);
  }
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browser.tabs.get(activeInfo.tabId);
    updateState(activeInfo.tabId, tab.url);
  } catch (e) {
    console.error("Failed to get tab info:", e);
  }
});

async function checkAllTabs() {
  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (!tab) continue;
      if (typeof tab.id !== "number") continue;
      updateState(tab.id, tab.url);
    }
  } catch (e) {
    console.error("Failed to query tabs:", e);
  }
}

async function initEnabledCache() {
  try {
    const res = await browser.storage.local.get(["enabled"]);
    enabledCached = res.enabled !== false;
  } catch (e) {
    enabledCached = true;
    console.error("Failed to read enabled state:", e);
  }

  await checkAllTabs();
}

browser.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    enabledCached = changes.enabled.newValue !== false;
    checkAllTabs();
  }
});

initEnabledCache();