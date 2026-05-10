// ==UserScript==
// @name         GeoFS Tag Filter Cycle
// @namespace    geofs-local
// @version      1.1
// @description  Q cycles: hide all tags -> hide only Foo tags -> show all tags
// @match        https://www.geo-fs.com/*
// @match        https://geo-fs.com/*
// @match        https://legacy.geo-fs.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MODES = {
    HIDE_ALL: 0,
    HIDE_FOO: 1,
    SHOW_ALL: 2
  };

  let mode = MODES.SHOW_ALL;

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function hideLabel(user) {
    if (user.label) {
      try { geofs.api.removeLabel(user.label); } catch (e) {}
      user.label = null;
    }
    if (user.icon) {
      try { user.icon.destroy(); } catch (e) {}
      user.icon = null;
    }
  }

  function showLabel(user) {
    if (!user || user.label) return;

    const styleKey =
      user.isTraffic ? 'traffic' :
      user.premium ? 'premium' :
      user.acid == 1 ? 'xavier' :
      'default';

    try {
      multiplayer.User.prototype.__originalAddCallsign.call(user, user.callsign || '', styleKey);
    } catch (e) {}
  }

  function applyModeToUser(user) {
    if (!user) return;

    const callsign = (user.callsign || '').trim();

    if (mode === MODES.HIDE_ALL) {
      hideLabel(user);
      return;
    }

    if (mode === MODES.HIDE_FOO) {
      if (callsign === 'Foo') {
        hideLabel(user);
      } else {
        showLabel(user);
      }
      return;
    }

    if (mode === MODES.SHOW_ALL) {
      showLabel(user);
    }
  }

  function applyMode() {
    const allUsers = multiplayer.users || {};
    for (const id in allUsers) {
      applyModeToUser(allUsers[id]);
    }

    const labels = {
      0: 'all tags hidden',
      1: 'only Foo tags hidden',
      2: 'all tags shown'
    };

    console.log('[GeoFS] Tag mode:', labels[mode]);
  }

  function patchGeoFS() {
    if (!window.multiplayer || !window.geofs || !multiplayer.User || !multiplayer.User.prototype) {
      return false;
    }

    const proto = multiplayer.User.prototype;

    if (!proto.__originalAddCallsign) {
      proto.__originalAddCallsign = proto.addCallsign;
    }
    if (!proto.__originalRemoveCallsign) {
      proto.__originalRemoveCallsign = proto.removeCallsign;
    }

    if (proto.__tagCyclePatchApplied) {
      return true;
    }

    proto.__tagCyclePatchApplied = true;

    proto.addCallsign = function (callsign, styleKey) {
      const cs = (this.callsign || callsign || '').trim();

      if (mode === MODES.HIDE_ALL) {
        this.label = null;
        if (this.icon) {
          try { this.icon.destroy(); } catch (e) {}
          this.icon = null;
        }
        return;
      }

      if (mode === MODES.HIDE_FOO && cs === 'Foo') {
        this.label = null;
        if (this.icon) {
          try { this.icon.destroy(); } catch (e) {}
          this.icon = null;
        }
        return;
      }

      return proto.__originalAddCallsign.call(this, callsign, styleKey);
    };

    proto.removeCallsign = function () {
      if (this.label) {
        try { geofs.api.removeLabel(this.label); } catch (e) {}
      }
      this.label = null;
      if (this.icon) {
        try { this.icon.destroy(); } catch (e) {}
        this.icon = null;
      }
    };

    document.addEventListener('keydown', function (event) {
      if (isTypingTarget(event.target)) return;
      if (event.repeat) return;
      if (event.key.toLowerCase() !== 'q') return;

      mode = (mode + 1) % 3;
      applyMode();
    });

    applyMode();
    console.log('[GeoFS] Q hotkey loaded: show all -> hide all -> hide Foo -> repeat');
    return true;
  }

  function waitForGeoFS() {
    if (!patchGeoFS()) {
      setTimeout(waitForGeoFS, 1000);
    }
  }

  waitForGeoFS();
})();
