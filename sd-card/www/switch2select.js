(function () {
  "use strict";

  var selectListeners = [];
  var focusListeners = [];
  var volumeListeners = [];
  var interactListeners = [];
  var switchListeners = [];
  var scanListeners = [];
  var level = 5;
  var audioCtx = null;

  function clampLevel(value) {
    var number = Math.round(Number(value));
    if (!isFinite(number)) return level;
    if (number < 0) return 0;
    if (number > 9) return 9;
    return number;
  }

  function emit(listeners, message) {
    for (var i = 0; i < listeners.length; i += 1) {
      listeners[i](message);
    }
  }

  function remember(message) {
    if (!message || message.source !== "switch2select") return false;
    var incoming = message.volume;
    if (incoming == null && message.level != null) incoming = message.level;
    if (incoming != null) level = clampLevel(incoming);
    return true;
  }

  function ensureAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) {
      try {
        audioCtx = new Ctx();
      } catch (err) {
        return null;
      }
    }
    if (audioCtx.state === "suspended") {
      var pending = audioCtx.resume();
      if (pending && typeof pending.catch === "function") pending.catch(function () {});
    }
    return audioCtx;
  }

  function playLocalTone(freq, ms) {
    var pitch = Number(freq);
    var duration = Number(ms);
    if (!isFinite(pitch) || pitch < 80 || pitch > 2000) return;
    if (!isFinite(duration) || duration < 40) duration = 40;
    if (duration > 700) duration = 700;
    if (level <= 0) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var now = ctx.currentTime;
      var seconds = duration / 1000;
      osc.type = "sine";
      osc.frequency.setValueAtTime(pitch, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 * (level / 9), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch (err) {
      /* a browser can reject a tone before audio is allowed */
    }
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!remember(data)) return;
    if (data.type === "focus") emit(focusListeners, data);
    else if (data.type === "select") emit(selectListeners, data);
    else if (data.type === "volume") emit(volumeListeners, data);
    else if (data.type === "interact") emit(interactListeners, data);
    else if (data.type === "switch") emit(switchListeners, data);
    else if (data.type === "scan") emit(scanListeners, data);
  });

  function listen(listeners, fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function openedDirectly() {
    try {
      return window.top === window;
    } catch (err) {
      return false;
    }
  }

  function demoRequested() {
    try {
      return new URLSearchParams(window.location.search).get("demo") === "1";
    } catch (err) {
      return false;
    }
  }

  function columnFromEvent(event) {
    var width = window.innerWidth || 1;
    var x = event && typeof event.clientX === "number" ? event.clientX : width / 2;
    if (x < 0) x = 0;
    var lane = Math.floor((x / width) * 4);
    if (lane < 0) return 0;
    if (lane > 3) return 3;
    return lane;
  }

  window.Switch2Select = {
    onSelect: function (fn) {
      listen(selectListeners, fn);
    },
    onFocus: function (fn) {
      listen(focusListeners, fn);
    },
    onVolume: function (fn) {
      listen(volumeListeners, fn);
    },
    onInteract: function (fn) {
      listen(interactListeners, fn);
    },
    onSwitch: function (fn) {
      listen(switchListeners, fn);
    },
    onScan: function (fn) {
      listen(scanListeners, fn);
    },
    volume: function () {
      return level;
    },
    setLevel: function (value) {
      level = clampLevel(value);
    },
    column: columnFromEvent,
    tone: function (freq, ms) {
      if (!openedDirectly()) {
        try {
          window.parent.postMessage({
            source: "switch2select-game",
            type: "tone",
            freq: freq,
            ms: ms
          }, "*");
        } catch (err) {
          playLocalTone(freq, ms);
        }
        return;
      }
      playLocalTone(freq, ms);
    },
    finish: function () {
      if (openedDirectly()) return;
      try {
        window.parent.postMessage({ source: "switch2select-game", type: "finish" }, "*");
      } catch (err) {
        /* the page can already be gone */
      }
    },
    unlock: function () {
      ensureAudio();
    }
  };

  if (openedDirectly()) {
    document.addEventListener("pointerdown", function () {
      ensureAudio();
    });
  }

  if (openedDirectly() && demoRequested()) {
    window.addEventListener("load", function () {
      var bar = document.createElement("div");
      bar.id = "s2s-demo";
      bar.style.position = "fixed";
      bar.style.left = "0";
      bar.style.right = "0";
      bar.style.bottom = "0";
      bar.style.zIndex = "20";
      bar.style.display = "flex";
      bar.style.justifyContent = "center";
      bar.style.gap = "4px";
      bar.style.padding = "4px";
      bar.style.background = "#222222";
      var labels = ["1", "2", "3", "4", "Scan"];
      labels.forEach(function (label, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.style.font = "16px Arial, sans-serif";
        button.addEventListener("click", function (event) {
          event.stopPropagation();
          if (index < 4) {
            emit(switchListeners, { source: "switch2select", type: "switch", index: index, volume: level });
          } else {
            emit(scanListeners, { source: "switch2select", type: "scan", volume: level });
          }
        });
        bar.appendChild(button);
      });
      document.body.appendChild(bar);

      document.addEventListener("keydown", function (event) {
        if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
        var key = event.key;
        if (key === "1" || key === "2" || key === "3" || key === "4") {
          event.preventDefault();
          emit(switchListeners, {
            source: "switch2select",
            type: "switch",
            index: Number(key) - 1,
            volume: level
          });
          return;
        }
        if (key === "Enter" || key === " " || key === "ArrowRight") {
          event.preventDefault();
          emit(scanListeners, { source: "switch2select", type: "scan", volume: level });
        }
      });
    });
  }
})();
