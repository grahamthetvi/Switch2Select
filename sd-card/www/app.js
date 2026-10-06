(function () {
  "use strict";

  var stage = document.getElementById("stage");
  var target = document.getElementById("target");
  var visual = document.getElementById("visual");
  var demo = document.getElementById("demo");

  var demoMode = false;
  try {
    demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
  } catch (err) {
    demoMode = false;
  }

  var config = null;
  var currentIndex = 0;
  var volumeLevel = 5;
  var deviceDriving = false;
  var scanTimer = 0;
  var socketRetry = 0;
  var speakToken = 0;
  var viewToken = 0;
  var mediaEpoch = Date.now();
  var showingChoice = false;
  var portWords = ["one", "two", "three", "four"];

  function demoConfig() {
    return {
      scanMode: "auto",
      scanDelayMs: 3000,
      outputPulseMs: 1000,
      volume: 5,
      options: [
        option("Yes", "", "image", "/media/yes.svg", "#000000", "#ffff00"),
        option("Look", "", "video", "/media/pulse.mp4", "#000000", "#ff0000"),
        option("Play", "", "game", "/games/look/index.html", "#000000", "#ffff00"),
        option("Help", "I need help", "tts", "", "#000000", "#ff0000")
      ]
    };
  }

  function option(label, phrase, type, src, background, color) {
    return {
      label: label,
      phrase: phrase,
      type: type,
      src: src,
      background: background,
      color: color
    };
  }

  function clampVolume(value, fallback) {
    var number = Math.round(Number(value));
    if (!isFinite(number)) return fallback;
    if (number < 0) return 0;
    if (number > 9) return 9;
    return number;
  }

  function positiveNumber(value, fallback) {
    var number = Number(value);
    if (!isFinite(number) || number <= 0) return fallback;
    return number;
  }

  function knownType(type) {
    if (type === "image" || type === "video" || type === "game" || type === "tts") return type;
    return "tts";
  }

  function normalizeOption(raw) {
    var source = raw && typeof raw === "object" ? raw : {};
    return {
      label: source.label != null ? String(source.label) : "",
      phrase: source.phrase != null ? String(source.phrase) : "",
      type: knownType(source.type),
      src: source.src != null ? String(source.src) : "",
      background: source.background ? String(source.background) : "#000000",
      color: source.color ? String(source.color) : "#ffff00"
    };
  }

  function normalizeConfig(data) {
    if (!data || !Array.isArray(data.options) || data.options.length !== 4) return null;
    return {
      scanMode: data.scanMode === "step" ? "step" : "auto",
      scanDelayMs: positiveNumber(data.scanDelayMs, 3000),
      outputPulseMs: positiveNumber(data.outputPulseMs, 1000),
      volume: clampVolume(data.volume == null ? 5 : data.volume, 5),
      options: [
        normalizeOption(data.options[0]),
        normalizeOption(data.options[1]),
        normalizeOption(data.options[2]),
        normalizeOption(data.options[3])
      ]
    };
  }

  function loadConfig(keepOnError) {
    return fetch("/config.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("missing config");
        return response.json();
      })
      .then(function (data) {
        var normalized = normalizeConfig(data);
        if (!normalized) throw new Error("bad config");
        return normalized;
      })
      .catch(function () {
        if (keepOnError && config) return config;
        return demoConfig();
      });
  }

  function mediaSrc(src) {
    if (!src) return "";
    var join = src.indexOf("?") >= 0 ? "&" : "?";
    return src + join + "v=" + mediaEpoch;
  }

  function mediaVolume() {
    if (volumeLevel <= 0) return 0;
    return volumeLevel / 9;
  }

  function portCue(index) {
    var item = config.options[index];
    var cue = "Port " + portWords[index];
    if (item && item.label) return cue + ", " + item.label;
    return cue;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    var synth = window.speechSynthesis;
    speakToken += 1;
    var token = speakToken;
    synth.cancel();
    if (!text) return;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volumeLevel === 0 ? 0 : volumeLevel / 9;
    utterance.rate = 0.9;
    window.setTimeout(function () {
      if (token !== speakToken) return;
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    }, 60);
  }

  function clearVisual() {
    var video = visual.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      try {
        video.load();
      } catch (err) {
        /* older players can throw if the element is already going away */
      }
    }
    visual.textContent = "";
  }

  function showText(text) {
    clearVisual();
    target.hidden = false;
    target.textContent = text;
  }

  function showImage(item) {
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    var img = document.createElement("img");
    img.src = mediaSrc(item.src);
    img.alt = item.label || "";
    img.draggable = false;
    visual.appendChild(img);
  }

  function showVideo(item) {
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    var video = document.createElement("video");
    video.src = mediaSrc(item.src);
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    applyElementVolume(video);
    video.addEventListener("loadedmetadata", function () {
      applyElementVolume(video);
    });
    visual.appendChild(video);
    var pending = video.play();
    if (pending && typeof pending.catch === "function") {
      pending.catch(function () {});
    }
  }

  function showGame(item, index) {
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    var iframe = document.createElement("iframe");
    iframe.src = mediaSrc(item.src);
    iframe.title = item.label || "Activity";
    iframe.setAttribute("frameborder", "0");
    iframe.addEventListener("load", function () {
      postToFrame(iframe, "select", index);
    });
    visual.appendChild(iframe);
  }

  function applyElementVolume(video) {
    try {
      video.volume = mediaVolume();
    } catch (err) {
      /* some engines reject volume before metadata is ready */
    }
  }

  function applyVideoVolume() {
    var video = visual.querySelector("video");
    if (video) applyElementVolume(video);
  }

  function applyColors(item) {
    stage.style.background = item.background || "#000000";
    stage.style.color = item.color || "#ffff00";
  }

  function postToFrame(iframe, type, index) {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        source: "switch2select",
        type: type,
        index: index,
        volume: volumeLevel
      },
      "*"
    );
  }

  function relay(type, index) {
    var iframe = visual.querySelector("iframe");
    if (!iframe) return false;
    postToFrame(iframe, type, index);
    return true;
  }

  function afterGameMessage(leavingGame, apply) {
    if (leavingGame) window.setTimeout(apply, 0);
    else apply();
  }

  function exactIndex(value) {
    if (value === 0 || value === 1 || value === 2 || value === 3) return value;
    return -1;
  }

  function renderFocus(index) {
    var item = config.options[index];
    currentIndex = index;
    applyColors(item);
    if (item.type === "image" && item.src) showImage(item);
    else showText(item.label);
    return item;
  }

  function showFocus(index, silent) {
    currentIndex = index;
    viewToken += 1;
    var token = viewToken;
    var leavingGame = relay("focus", index);
    afterGameMessage(leavingGame, function () {
      if (token !== viewToken) return;
      showingChoice = false;
      renderFocus(index);
      if (!silent) speak(portCue(index));
    });
  }

  function activate(index, silent) {
    var item = config.options[index];
    currentIndex = index;
    viewToken += 1;
    var token = viewToken;
    var openingGame = item.type === "game" && !!item.src;
    var leavingGame = !openingGame && relay("select", index);
    afterGameMessage(leavingGame, function () {
      if (token !== viewToken) return;
      showingChoice = true;
      applyColors(item);
      if (openingGame) showGame(item, index);
      else if (item.type === "image" && item.src) showImage(item);
      else if (item.type === "video" && item.src) showVideo(item);
      else showText(item.type === "tts" ? item.phrase || item.label : item.label);
      if (silent) return;
      if (item.type === "tts") speak(item.phrase || item.label);
      else speak(item.label);
    });
    armAutoScan();
  }

  function advance() {
    showFocus((currentIndex + 1) % config.options.length);
    armAutoScan();
  }

  function replayVideo() {
    var video = visual.querySelector("video");
    if (!video) return;
    try {
      video.currentTime = 0;
    } catch (err) {
      /* a video that has not opened yet can reject a seek */
    }
    applyElementVolume(video);
    var pending = video.play();
    if (pending && typeof pending.catch === "function") {
      pending.catch(function () {});
    }
  }

  function performDeviceInteract() {
    var item = config.options[currentIndex];
    var inGame = relay("interact", currentIndex);
    if (!inGame && item.type === "video") replayVideo();
    speak(portCue(currentIndex));
  }

  function setVolume(level) {
    volumeLevel = clampVolume(level, volumeLevel);
    applyVideoVolume();
    relay("volume", currentIndex);
  }

  function stopAutoScan() {
    if (!scanTimer) return;
    window.clearInterval(scanTimer);
    scanTimer = 0;
  }

  function armAutoScan() {
    stopAutoScan();
    if (!demoMode || deviceDriving || !config || config.scanMode !== "auto") return;
    scanTimer = window.setInterval(function () {
      showFocus((currentIndex + 1) % config.options.length);
    }, config.scanDelayMs);
  }

  function onDeviceMessage(message) {
    if (!message || typeof message !== "object" || typeof message.type !== "string") return;
    deviceDriving = true;
    stopAutoScan();
    if (message.type === "hello") {
      if (message.volume != null) setVolume(message.volume);
      var helloIndex = exactIndex(message.index);
      showFocus(helloIndex < 0 ? 0 : helloIndex);
      return;
    }
    if (message.type === "focus") {
      var focusIndex = exactIndex(message.index);
      if (focusIndex < 0) return;
      showFocus(focusIndex);
      return;
    }
    if (message.type === "select") {
      var selectIndex = exactIndex(message.index);
      if (selectIndex < 0) return;
      activate(selectIndex);
      return;
    }
    if (message.type === "volume") {
      setVolume(message.level);
      return;
    }
    if (message.type === "interact") {
      var interactIndex = exactIndex(message.index);
      if (interactIndex >= 0 && interactIndex !== currentIndex) {
        currentIndex = interactIndex;
        renderFocus(interactIndex);
      }
      performDeviceInteract();
      return;
    }
    if (message.type === "config") {
      mediaEpoch = Date.now();
      loadConfig(true).then(function (loaded) {
        if (!loaded) return;
        config = loaded;
        volumeLevel = loaded.volume;
        applyVideoVolume();
        if (showingChoice) activate(currentIndex, true);
        else showFocus(currentIndex, true);
      });
    }
  }

  function connectSocket() {
    if (socketRetry) {
      window.clearTimeout(socketRetry);
      socketRetry = 0;
    }
    if (window.location.protocol === "file:") return;
    var socket;
    try {
      socket = new WebSocket("ws://" + window.location.hostname + ":81");
    } catch (err) {
      return;
    }
    socket.onopen = function () {
      deviceDriving = true;
      stopAutoScan();
    };
    socket.onerror = function () {};
    socket.onclose = function () {
      var wasDriving = deviceDriving;
      deviceDriving = false;
      if (wasDriving) armAutoScan();
      socketRetry = window.setTimeout(connectSocket, 5000);
    };
    socket.onmessage = function (event) {
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      onDeviceMessage(message);
    };
  }

  function onDemoClick(event) {
    if (!config) return;
    var button = event.target;
    while (button && button !== demo && button.tagName !== "BUTTON") button = button.parentNode;
    if (!button || button === demo) return;
    var indexAttr = button.getAttribute("data-index");
    if (indexAttr != null) {
      var index = exactIndex(Number(indexAttr));
      if (index >= 0) activate(index);
      return;
    }
    var action = button.getAttribute("data-action");
    if (action === "advance") advance();
    else if (action === "select") activate(currentIndex);
    else if (action === "volup") setVolume(volumeLevel + 1);
    else if (action === "voldown") setVolume(volumeLevel - 1);
    else if (action === "device") performDeviceInteract();
  }

  function onDemoKey(event) {
    if (!demoMode || !config) return;
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    var key = event.key;
    if (key === "1" || key === "2" || key === "3" || key === "4") {
      event.preventDefault();
      activate(Number(key) - 1);
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      advance();
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      activate(currentIndex);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      setVolume(volumeLevel + 1);
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      setVolume(volumeLevel - 1);
      return;
    }
    if (key === "d" || key === "D") {
      event.preventDefault();
      performDeviceInteract();
    }
  }

  function fitStage() {
    if (!demoMode) return;
    stage.style.bottom = demo.offsetHeight + "px";
  }

  if (demoMode) {
    demo.hidden = false;
    document.body.classList.add("demo");
    fitStage();
  }
  window.addEventListener("resize", fitStage);
  demo.addEventListener("click", onDemoClick);
  document.addEventListener("keydown", onDemoKey);

  loadConfig(false).then(function (loaded) {
    config = loaded;
    volumeLevel = loaded.volume;
    renderFocus(0);
    if (demoMode) speak(portCue(0));
    armAutoScan();
    connectSocket();
  });
})();
