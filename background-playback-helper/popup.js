"use strict";

(function () {
  const DEFAULTS = {
    enabled: true,
    enableFix: true,
    enableKeepAlive: true,
    keepAliveMethod: "keyboard", // keyboard | mouse | alternate
    autoDismissDialogs: true,
  };

  function getApi() {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    return null;
  }

  const api = getApi();
  const storageLocal = api && api.storage && api.storage.local ? api.storage.local : null;

  function normalizeMethod(value) {
    if (value === "mouse") return "mouse";
    if (value === "alternate") return "alternate";
    return "keyboard";
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!storageLocal || typeof storageLocal.get !== "function") return resolve({});
      try {
        if (storageLocal.get.length >= 2) {
          storageLocal.get(keys, (res) => resolve(res || {}));
        } else {
          const p = storageLocal.get(keys);
          if (p && typeof p.then === "function") p.then((res) => resolve(res || {})).catch(() => resolve({}));
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
          if (p && typeof p.then === "function") p.then(() => resolve()).catch(() => resolve());
          else resolve();
        }
      } catch {
        resolve();
      }
    });
  }

  function setDependentControlsEnabled(isMasterOn, isKeepAliveOn) {
    const controlsSection = document.getElementById("controls-section");
    const methodSelect = document.getElementById("method-select");

    if (!controlsSection) return;

    const enabled = !!isMasterOn;

    // Match your CSS: .controls-section.dimmed
    controlsSection.classList.toggle("dimmed", !enabled);

    const fixToggle = document.getElementById("fix-toggle");
    const aliveToggle = document.getElementById("alive-toggle");
    const dismissToggle = document.getElementById("dismiss-toggle");

    if (fixToggle) fixToggle.disabled = !enabled;
    if (aliveToggle) aliveToggle.disabled = !enabled;
    if (dismissToggle) dismissToggle.disabled = !enabled;

    const methodEnabled = enabled && !!isKeepAliveOn;
    if (methodSelect) methodSelect.disabled = !methodEnabled;
  }

  function applyUiState(state) {
    const masterToggle = document.getElementById("master-toggle");
    const fixToggle = document.getElementById("fix-toggle");
    const aliveToggle = document.getElementById("alive-toggle");
    const methodSelect = document.getElementById("method-select");
    const dismissToggle = document.getElementById("dismiss-toggle");

    if (masterToggle) masterToggle.checked = !!state.enabled;
    if (fixToggle) fixToggle.checked = !!state.enableFix;
    if (aliveToggle) aliveToggle.checked = !!state.enableKeepAlive;
    if (methodSelect) methodSelect.value = normalizeMethod(state.keepAliveMethod);
    if (dismissToggle) dismissToggle.checked = !!state.autoDismissDialogs;
    setDependentControlsEnabled(!!state.enabled, !!state.enableKeepAlive);
  }

  async function loadSettings() {
    const res = await storageGet(Object.keys(DEFAULTS));
    const state = {
      enabled: res.enabled !== false,
      enableFix: res.enableFix !== false,
      enableKeepAlive: res.enableKeepAlive !== false,
      keepAliveMethod: normalizeMethod(res.keepAliveMethod),
      autoDismissDialogs: res.autoDismissDialogs !== false,
    };

    await storageSet({
      enabled: state.enabled,
      enableFix: state.enableFix,
      enableKeepAlive: state.enableKeepAlive,
      keepAliveMethod: state.keepAliveMethod,
      autoDismissDialogs: state.autoDismissDialogs,
    });

    return state;
  }

  async function saveSettings(partial) {
    const normalized = { ...partial };
    if (Object.prototype.hasOwnProperty.call(normalized, "keepAliveMethod")) {
      normalized.keepAliveMethod = normalizeMethod(normalized.keepAliveMethod);
    }
    await storageSet(normalized);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const masterToggle = document.getElementById("master-toggle");
    const fixToggle = document.getElementById("fix-toggle");
    const aliveToggle = document.getElementById("alive-toggle");
    const methodSelect = document.getElementById("method-select");
    const dismissToggle = document.getElementById("dismiss-toggle");
    const resetBtn = document.getElementById("reset-btn");

    const state = await loadSettings();
    applyUiState(state);

    if (masterToggle) {
      masterToggle.addEventListener("change", async () => {
        const on = !!masterToggle.checked;
        setDependentControlsEnabled(on, aliveToggle ? !!aliveToggle.checked : true);
        await saveSettings({ enabled: on });
      });
    }

    if (fixToggle) {
      fixToggle.addEventListener("change", async () => {
        await saveSettings({ enableFix: !!fixToggle.checked });
      });
    }

    if (aliveToggle) {
      aliveToggle.addEventListener("change", async () => {
        const masterOn = masterToggle ? !!masterToggle.checked : true;
        setDependentControlsEnabled(masterOn, !!aliveToggle.checked);
        await saveSettings({ enableKeepAlive: !!aliveToggle.checked });
      });
    }

    if (methodSelect) {
      methodSelect.addEventListener("change", async () => {
        await saveSettings({ keepAliveMethod: methodSelect.value });
      });
    }

    if (dismissToggle) {
      dismissToggle.addEventListener("change", async () => {
        await saveSettings({ autoDismissDialogs: !!dismissToggle.checked });
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", async () => {
        await saveSettings(DEFAULTS);
        applyUiState(DEFAULTS);
      });
    }
  });
})();