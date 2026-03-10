"use strict";

(() => {
  // Frame bail: run only in the top window to avoid overhead in ads/utility iframes.
  if (window.top !== window) return;

  const originalHiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
  const originalVisibilityDesc = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

  const CONFIG = {
    loopMin: 30000,
    loopMax: 60000,
    keys: [
      { code: "ShiftLeft", key: "Shift", keyCode: 16 },
      { code: "ControlLeft", key: "Control", keyCode: 17 },
      { code: "AltLeft", key: "Alt", keyCode: 18 },
    ],
    prePauseKickDelayMs: 40,
    prePauseKickBurst: 3,
    prePauseKickSpacingMs: 80,

    dialogCheckIntervalMs: 2000,
    playerActivationIntervalMs: 60000,
  };

  let loopTimeout = null;
  let alternateFlip = false;
  let lastRealHidden = null;

  let dialogCheckInterval = null;
  let playerActivationInterval = null;

  const isEnabled = () => document.documentElement.getAttribute("data-bg-play-enabled") !== "false";
  const isFixEnabled = () => document.documentElement.getAttribute("data-bg-play-fix") !== "false";
  const isKeepAliveEnabled = () => document.documentElement.getAttribute("data-bg-play-keepalive") !== "false";
  const isAutoDismissEnabled = () => document.documentElement.getAttribute("data-bg-play-autodismiss") === "true";

  const getKeepAliveMethod = () => {
    const v = document.documentElement.getAttribute("data-bg-play-method");
    if (v === "mouse") return "mouse";
    if (v === "alternate") return "alternate";
    return "keyboard";
  };

  const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const getRealHidden = () => {
    try {
      if (originalHiddenDesc && typeof originalHiddenDesc.get === "function") {
        return !!originalHiddenDesc.get.call(document);
      }
    } catch {}
    return false;
  };

  const isYouTubeFamily = () => {
    const h = window.location.hostname || "";
    if (h === "youtube.com" || h.endsWith(".youtube.com")) return true;
    if (h === "youtube-nocookie.com" || h.endsWith(".youtube-nocookie.com")) return true;
    return false;
  };

  const findVideoCandidate = () => {
    const videos = document.querySelectorAll("video");
    for (const v of videos) {
      if (!v) continue;
      if (v.ended) continue;
      if (v.readyState >= 2) return v;
    }
    return null;
  };

  const findPlayingVideo = () => {
    const videos = document.querySelectorAll("video");
    for (const v of videos) {
      if (!v) continue;
      if (!v.paused && !v.ended && v.readyState >= 2) return v;
    }
    return null;
  };

  const getEventPointForTarget = (targetEl) => {
    try {
      const el = targetEl && targetEl.getBoundingClientRect ? targetEl : null;
      const r = el ? el.getBoundingClientRect() : null;

      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      if (r && Number.isFinite(r.left) && Number.isFinite(r.top) && r.width > 0 && r.height > 0) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return {
          x: Math.min(Math.max(1, cx), Math.max(1, vw - 1)),
          y: Math.min(Math.max(1, cy), Math.max(1, vh - 1)),
        };
      }

      // Fallback: center of viewport
      return {
        x: Math.max(1, Math.floor(vw / 2)),
        y: Math.max(1, Math.floor(vh / 2)),
      };
    } catch {
      return { x: 50, y: 50 };
    }
  };

  const dispatchKeyboardKeepAlive = (targetEl) => {
    const keyObj = CONFIG.keys[getRandomInt(0, CONFIG.keys.length - 1)];
    const init = {
      bubbles: true,
      cancelable: true,
      key: keyObj.key,
      code: keyObj.code,
      keyCode: keyObj.keyCode,
      which: keyObj.keyCode,
    };

    const down = new KeyboardEvent("keydown", init);
    const up = new KeyboardEvent("keyup", init);

    const t = targetEl || document;
    t.dispatchEvent(down);
    setTimeout(() => {
      try {
        t.dispatchEvent(up);
      } catch {}
    }, 50);
  };

  const dispatchMouseKeepAlive = (targetEl) => {
    const t = targetEl || document;
    const pt = getEventPointForTarget(targetEl);

    try {
      if (typeof PointerEvent !== "undefined") {
        t.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: false,
            pointerType: "mouse",
            clientX: pt.x,
            clientY: pt.y,
          })
        );
        return;
      }
    } catch {}

    try {
      t.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: false,
          clientX: pt.x,
          clientY: pt.y,
        })
      );
    } catch {}
  };

  const dispatchKeepAlive = () => {
    const target = findPlayingVideo() || findVideoCandidate() || document;
    const method = getKeepAliveMethod();

    if (method === "mouse") {
      dispatchMouseKeepAlive(target);
      return;
    }

    if (method === "alternate") {
      alternateFlip = !alternateFlip;
      if (alternateFlip) dispatchKeyboardKeepAlive(target);
      else dispatchMouseKeepAlive(target);
      return;
    }

    dispatchKeyboardKeepAlive(target);
  };

  const shouldDispatchKeepAlive = () => {
    if (!isEnabled()) return false;
    if (!isKeepAliveEnabled()) return false;

    const realHidden = getRealHidden();
    if (!realHidden) return false;

    const v = findPlayingVideo() || findVideoCandidate();
    return !!v;
  };

  const clearLoop = () => {
    if (loopTimeout) {
      clearTimeout(loopTimeout);
      loopTimeout = null;
    }
  };

  const scheduleNext = () => {
    const nextRun = getRandomInt(CONFIG.loopMin, CONFIG.loopMax);
    loopTimeout = setTimeout(performKeepAliveTick, nextRun);
  };

  const performKeepAliveTick = () => {
    try {
      if (shouldDispatchKeepAlive()) dispatchKeepAlive();
    } catch {}

    if (isEnabled() && isKeepAliveEnabled()) scheduleNext();
    else clearLoop();
  };

  const startLoop = () => {
    clearLoop();
    if (isEnabled() && isKeepAliveEnabled()) scheduleNext();
  };

  const schedulePrePauseKick = () => {
    setTimeout(() => {
      try {
        if (!isEnabled()) return;
        if (!isKeepAliveEnabled()) return;
        if (!getRealHidden()) return;

        for (let i = 0; i < CONFIG.prePauseKickBurst; i++) {
          setTimeout(() => {
            try {
              if (!isEnabled()) return;
              if (!isKeepAliveEnabled()) return;
              if (!getRealHidden()) return;
              dispatchKeepAlive();
            } catch {}
          }, i * CONFIG.prePauseKickSpacingMs);
        }
      } catch {}
    }, CONFIG.prePauseKickDelayMs);
  };

  // ---------- Auto-dismiss + player activation (YouTube family including YT Music) ----------

  const DIALOG_PHRASES = [
    "continue watching",
    "still there",
    "still listening",
    "keep listening",
    "are you still watching",
    "video paused",
  ];

  const normalizeText = (s) => {
    const t = (s || "").toLowerCase();
    return t.replace(/[?!.:,;]+/g, " ").replace(/\s+/g, " ").trim();
  };

  const shouldRunAutoDismiss = () => {
    if (!isEnabled()) return false;
    if (!isAutoDismissEnabled()) return false;

    // Includes music.youtube.com because it ends with .youtube.com
    if (!isYouTubeFamily()) return false;

    const v = findPlayingVideo() || findVideoCandidate();
    return !!v;
  };

  const findDialogByPhrases = (phrasesLower) => {
    const roots = document.querySelectorAll(
      'tp-yt-paper-dialog, ytd-confirm-dialog-renderer, ytd-enforcement-message-view-model, [role="dialog"], [role="alertdialog"]'
    );

    for (const root of roots) {
      const text = normalizeText(root.innerText || root.textContent || "");
      if (!text) continue;
      if (phrasesLower.some((p) => text.includes(p))) return root;
    }
    return null;
  };

  const collectClickableButtons = (dialogRoot) => {
    const out = [];

    const btns = dialogRoot.querySelectorAll("button, tp-yt-paper-button");
    for (const b of btns) out.push(b);

    const renderers = dialogRoot.querySelectorAll("yt-button-renderer");
    for (const r of renderers) {
      const b = r.querySelector("button");
      if (b) out.push(b);
    }

    return out;
  };

  const isNegativeButton = (btn) => {
    const text = normalizeText(btn.textContent || "");
    const aria = normalizeText(btn.getAttribute ? btn.getAttribute("aria-label") : "");
    const v = `${text} ${aria}`.trim();

    if (!v) return false;

    // Explicit negatives to avoid accidental clicks.
    return (
      v === "no" ||
      v.includes("no thanks") ||
      v.includes("not now") ||
      v.includes("cancel") ||
      v.includes("dismiss") ||
      v.includes("close") ||
      v.includes("stop") ||
      v.includes("don't") ||
      v.includes("do not")
    );
  };

  const isAffirmativeButton = (btn) => {
    if (isNegativeButton(btn)) return false;

    const text = normalizeText(btn.textContent || "");
    const aria = normalizeText(btn.getAttribute ? btn.getAttribute("aria-label") : "");

    // Conservative exact matches first
    if (text === "yes" || aria === "yes") return true;
    if (text === "ok" || aria === "ok") return true;
    if (text === "continue" || aria === "continue") return true;

    // Narrow contains fallback
    if (text.includes("continue") || aria.includes("continue")) return true;
    if (text.includes("keep listening") || aria.includes("keep listening")) return true;

    return false;
  };

  const clearDialogCheck = () => {
    if (dialogCheckInterval) {
      clearInterval(dialogCheckInterval);
      dialogCheckInterval = null;
    }
  };

  const clearPlayerActivation = () => {
    if (playerActivationInterval) {
      clearInterval(playerActivationInterval);
      playerActivationInterval = null;
    }
  };

  const checkAndDismissDialogs = () => {
    if (!shouldRunAutoDismiss()) return;

    try {
      const phrases = DIALOG_PHRASES.map((p) => normalizeText(p));
      const dialog = findDialogByPhrases(phrases);
      if (!dialog) return;

      const buttons = collectClickableButtons(dialog);
      if (!buttons.length) return;

      const btn = buttons.find(isAffirmativeButton);
      if (btn) btn.click();
    } catch {}
  };

  const activateYouTubePlayer = () => {
    if (!shouldRunAutoDismiss()) return;

    try {
      const moviePlayer = document.getElementById("movie_player");
      if (moviePlayer && typeof moviePlayer.updateLastActiveTime === "function") {
        moviePlayer.updateLastActiveTime();
        return;
      }

      const ytdPlayer = document.querySelector("ytd-player");
      if (ytdPlayer) {
        const api =
          (typeof ytdPlayer.getPlayer === "function" ? ytdPlayer.getPlayer() : null) ||
          ytdPlayer.player_ ||
          null;

        if (api && typeof api.updateLastActiveTime === "function") {
          api.updateLastActiveTime();
          return;
        }
      }
    } catch {}
  };

  const startAutoDismiss = () => {
    clearDialogCheck();
    clearPlayerActivation();

    if (!isEnabled() || !isAutoDismissEnabled()) return;
    if (!isYouTubeFamily()) return;

    dialogCheckInterval = setInterval(checkAndDismissDialogs, CONFIG.dialogCheckIntervalMs);
    playerActivationInterval = setInterval(activateYouTubePlayer, CONFIG.playerActivationIntervalMs);

    activateYouTubePlayer();
    checkAndDismissDialogs();
  };

  const stopAutoDismiss = () => {
    clearDialogCheck();
    clearPlayerActivation();
  };

  // ---------- Visibility spoofing (Fix) ----------

  Object.defineProperty(document, "hidden", {
    configurable: true,
    enumerable: true,
    get() {
      if (isEnabled() && isFixEnabled()) return false;
      if (originalHiddenDesc && typeof originalHiddenDesc.get === "function") {
        return originalHiddenDesc.get.call(this);
      }
      return false;
    },
  });

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    enumerable: true,
    get() {
      if (isEnabled() && isFixEnabled()) return "visible";
      if (originalVisibilityDesc && typeof originalVisibilityDesc.get === "function") {
        return originalVisibilityDesc.get.call(this);
      }
      return "visible";
    },
  });

  const onVisChangeCapture = (evt) => {
    const nowHidden = getRealHidden();
    if (lastRealHidden === null) lastRealHidden = nowHidden;

    // IMPORTANT:
    // Only block/neutralize visibilitychange when the page is *actually* hidden.
    // On desktop YouTube, blanket-blocking this event can interfere with UI state
    // (e.g., the search/menu overlay getting "stuck" open).
    if (isEnabled() && isFixEnabled() && nowHidden) {
      evt.stopImmediatePropagation();
      evt.preventDefault();
    }

    if (nowHidden && lastRealHidden === false) {
      if (isEnabled() && isKeepAliveEnabled()) schedulePrePauseKick();
    }

    lastRealHidden = nowHidden;
  };

  document.addEventListener("visibilitychange", onVisChangeCapture, true);
  window.addEventListener("visibilitychange", onVisChangeCapture, true);

  // Vimeo-specific fullscreenchange blocking
  const hostname = window.location.hostname || "";
  if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
    document.addEventListener(
      "fullscreenchange",
      (evt) => {
        if (isEnabled() && isFixEnabled()) {
          evt.stopImmediatePropagation();
          evt.preventDefault();
        }
      },
      true
    );
  }

  // Observe bridge attribute changes
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && (m.attributeName || "").startsWith("data-bg-play-")) {
        if (isEnabled() && isKeepAliveEnabled()) {
          if (!loopTimeout) startLoop();
        } else {
          clearLoop();
        }

        if (isEnabled() && isAutoDismissEnabled()) startAutoDismiss();
        else stopAutoDismiss();

        break;
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-bg-play-enabled",
        "data-bg-play-fix",
        "data-bg-play-keepalive",
        "data-bg-play-method",
        "data-bg-play-autodismiss",
      ],
    });
  }

  // Boot
  startLoop();
  startAutoDismiss();

  window.addEventListener("pagehide", () => {
    clearLoop();
    stopAutoDismiss();
  });

  window.addEventListener("unload", () => {
    clearLoop();
    stopAutoDismiss();
  });
})();
