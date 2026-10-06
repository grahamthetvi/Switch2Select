(function () {
  "use strict";

  var selectListeners = [];
  var focusListeners = [];
  var volumeListeners = [];
  var interactListeners = [];
  var level = 5;

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

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!remember(data)) return;
    if (data.type === "focus") emit(focusListeners, data);
    else if (data.type === "select") emit(selectListeners, data);
    else if (data.type === "volume") emit(volumeListeners, data);
    else if (data.type === "interact") emit(interactListeners, data);
  });

  function listen(listeners, fn) {
    if (typeof fn === "function") listeners.push(fn);
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
    volume: function () {
      return level;
    }
  };

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

  if (openedDirectly() && demoRequested()) {
    window.addEventListener("load", function () {
      window.setTimeout(function () {
        emit(selectListeners, {
          source: "switch2select",
          type: "select",
          index: 0,
          volume: level
        });
      }, 300);
    });
  }
})();
