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
  var roundTimer = 0;
  var socketRetry = 0;
  var liveSocket = null;
  var speakToken = 0;
  var viewToken = 0;
  var mediaEpoch = Date.now();
  var showingChoice = false;
  var mode = "scan";
  var pendingGame = null;
  var playIdleMs = 70000;
  var portWords = ["one", "two", "three", "four"];

  function demoConfig() {
    return {
      scanMode: "auto",
      scanDelayMs: 3000,
      outputPulseMs: 1000,
      volume: 5,
      options: [
        option("Yes", "Yes", "image", "/media/yes.svg", "#000000", "#ffff00"),
        option("Look", "Look", "video", "/media/pulse.mp4", "#000000", "#ff0000"),
        option("Play", "Play", "game", "/games/look/index.html", "#000000", "#ffff00"),
        option("Help", "I need help", "tts", "", "#000000", "#ffff00")
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

  function publishVolume() {
    if (window.Switch2Select && typeof Switch2Select.setLevel === "function") {
      Switch2Select.setLevel(volumeLevel);
    }
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

  function speechHoldMs(text) {
    var letters = text ? String(text).length : 0;
    var estimate = 1600 + letters * 90;
    var dwell = config ? config.scanDelayMs : 3000;
    var ms = estimate;
    if (dwell > ms) ms = dwell;
    if (ms < 3500) ms = 3500;
    if (ms > 12000) ms = 12000;
    return ms;
  }

  function clearRound() {
    if (!roundTimer) return;
    window.clearTimeout(roundTimer);
    roundTimer = 0;
  }

  function armRound(ms, token) {
    clearRound();
    roundTimer = window.setTimeout(function () {
      roundTimer = 0;
      if (token !== viewToken || mode === "scan") return;
      endRound(false);
    }, ms);
  }

  function sendControl(type) {
    if (!liveSocket || liveSocket.readyState !== 1) return;
    try {
      liveSocket.send(JSON.stringify({ type: type }));
    } catch (err) {
      /* the socket can close between the ready check and the send */
    }
  }

  function startControl(kind) {
    mode = kind === "play" ? "play" : "activity";
    sendControl(mode === "play" ? "play" : "hold");
    stopAutoScan();
  }

  function clearVisual() {
    pendingGame = null;
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
    var iframe = visual.querySelector("iframe");
    if (iframe) iframe.src = "about:blank";
    visual.textContent = "";
  }

  function markPop(el) {
    var stamp = String(Date.now() + Math.random());
    el.setAttribute("data-pop", stamp);
    el.className = "chosen";
    el.addEventListener("animationend", function done() {
      el.removeEventListener("animationend", done);
      if (el.getAttribute("data-pop") !== stamp) return;
      el.className = "";
    });
  }

  function showText(text, chosen) {
    clearVisual();
    target.hidden = false;
    target.textContent = text || "";
    if (chosen) markPop(target);
    else target.className = "";
  }

  function showImage(item, chosen) {
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    target.className = "";
    var img = document.createElement("img");
    img.src = mediaSrc(item.src);
    img.alt = item.label || "";
    img.draggable = false;
    visual.appendChild(img);
    if (chosen) markPop(img);
  }

  function showVideo(item, token) {
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    target.className = "";
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
    video.addEventListener("ended", function () {
      if (token !== viewToken) return;
      endRound(false);
    });
    video.addEventListener("error", function () {
      if (token !== viewToken) return;
      armRound(3000, token);
    });
    visual.appendChild(video);
    var pending = video.play();
    if (pending && typeof pending.catch === "function") {
      pending.catch(function () {});
    }
    armRound(90000, token);
  }

  function openGame(item, index, token) {
    var existing = visual.querySelector("iframe");
    if (existing && existing.getAttribute("data-game") === item.src && existing.getAttribute("data-ready") === "1") {
      postToFrame(existing, "switch", index);
      return;
    }
    clearVisual();
    target.hidden = true;
    target.textContent = "";
    target.className = "";
    var iframe = document.createElement("iframe");
    iframe.setAttribute("data-game", item.src);
    iframe.title = item.label || "Game";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.addEventListener("load", function () {
      if (token !== viewToken) return;
      var path = item.src.split("?")[0];
      var loaded = "";
      try {
        loaded = iframe.contentWindow && iframe.contentWindow.location
          ? iframe.contentWindow.location.pathname
          : "";
      } catch (err) {
        return;
      }
      if (loaded !== path) return;
      if (iframe.getAttribute("data-ready") === "1") return;
      iframe.setAttribute("data-ready", "1");
      var queued = pendingGame;
      pendingGame = null;
      if (queued) postToFrame(iframe, queued.type, queued.index);
      else postToFrame(iframe, "switch", index);
    });
    visual.appendChild(iframe);
    iframe.src = mediaSrc(item.src);
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

  function notePlayInput() {
    if (mode !== "play") return;
    sendControl("play");
    armRound(playIdleMs, viewToken);
  }

  function forwardPlay(type, index) {
    if (mode !== "play") return;
    notePlayInput();
    var iframe = visual.querySelector("iframe");
    if (!iframe || iframe.getAttribute("data-ready") !== "1") {
      pendingGame = { type: type, index: index };
      return;
    }
    postToFrame(iframe, type, index);
  }

  function renderFocus(index) {
    var item = config.options[index];
    currentIndex = index;
    applyColors(item);
    if (item.type === "image" && item.src) showImage(item, false);
    else showText(item.label, false);
    return item;
  }

  function showFocus(index, silent) {
    clearRound();
    if (mode !== "scan") {
      mode = "scan";
      sendControl("resume");
    }
    currentIndex = index;
    viewToken += 1;
    showingChoice = false;
    renderFocus(index);
    if (!silent) speak(portCue(index));
  }

  function endRound(announce) {
    var item = config.options[currentIndex];
    var keepImage = !announce && mode !== "play" && item && item.type === "image" && item.src && visual.querySelector("img");
    if (keepImage) {
      clearRound();
      mode = "scan";
      sendControl("resume");
      showingChoice = false;
      viewToken += 1;
      target.className = "";
      armAutoScan();
      return;
    }
    showFocus(currentIndex, !announce);
    armAutoScan();
  }

  function activate(index, silent) {
    var item = config.options[index];
    if (!item) return;
    currentIndex = index;
    viewToken += 1;
    var token = viewToken;
    clearRound();
    showingChoice = true;
    applyColors(item);
    if (item.type === "game" && item.src) {
      startControl("play");
      openGame(item, index, token);
      armRound(playIdleMs, token);
      if (!silent) speak(item.label);
      return;
    }
    startControl("hold");
    if (item.type === "image" && item.src) {
      showImage(item, true);
      if (!silent) speak(item.label);
      armRound(speechHoldMs(item.label), token);
      return;
    }
    if (item.type === "video" && item.src) {
      showVideo(item, token);
      if (!silent) speak(item.label);
      return;
    }
    var line = item.type === "tts" ? (item.phrase || item.label) : item.label;
    showText(line, true);
    if (!silent) speak(line);
    armRound(speechHoldMs(line), token);
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
    if (mode === "play") {
      endRound(true);
      return;
    }
    var item = config.options[currentIndex];
    if (item && item.type === "video") replayVideo();
    speak(portCue(currentIndex));
  }

  function setVolume(level) {
    volumeLevel = clampVolume(level, volumeLevel);
    publishVolume();
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
    if (!demoMode || deviceDriving || mode !== "scan" || !config || config.scanMode !== "auto") return;
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
      if (mode !== "scan") {
        sendControl(mode === "play" ? "play" : "hold");
        return;
      }
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
      if (mode === "play") {
        forwardPlay("switch", selectIndex);
        return;
      }
      activate(selectIndex);
      return;
    }
    if (message.type === "switch") {
      var switchIndex = exactIndex(message.index);
      if (switchIndex < 0) return;
      forwardPlay("switch", switchIndex);
      return;
    }
    if (message.type === "scan") {
      forwardPlay("scan", currentIndex);
      return;
    }
    if (message.type === "volume") {
      setVolume(message.level);
      return;
    }
    if (message.type === "interact") {
      if (mode === "play") {
        endRound(true);
        return;
      }
      var interactIndex = exactIndex(message.index);
      if (mode === "scan" && interactIndex >= 0 && interactIndex !== currentIndex) {
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
        publishVolume();
        applyVideoVolume();
        showFocus(currentIndex, true);
        armAutoScan();
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
    liveSocket = socket;
    socket.onopen = function () {
      deviceDriving = true;
      stopAutoScan();
      if (mode === "play") sendControl("play");
      else if (mode === "activity") sendControl("hold");
    };
    socket.onerror = function () {};
    socket.onclose = function () {
      var wasDriving = deviceDriving;
      deviceDriving = false;
      if (liveSocket === socket) liveSocket = null;
      if (wasDriving && mode === "scan") armAutoScan();
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
      if (index < 0) return;
      if (mode === "play") forwardPlay("switch", index);
      else activate(index);
      return;
    }
    var action = button.getAttribute("data-action");
    if (mode === "play" && (action === "advance" || action === "select")) {
      forwardPlay("scan", currentIndex);
      return;
    }
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
      var index = Number(key) - 1;
      if (mode === "play") forwardPlay("switch", index);
      else activate(index);
      return;
    }
    if (key === "ArrowRight" || key === "Enter") {
      event.preventDefault();
      if (mode === "play") {
        forwardPlay("scan", currentIndex);
        return;
      }
      if (key === "ArrowRight") advance();
      else activate(currentIndex);
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

  function onGameMessage(event) {
    var data = event.data;
    if (!data || data.source !== "switch2select-game") return;
    var iframe = visual.querySelector("iframe");
    if (!iframe || event.source !== iframe.contentWindow) return;
    if (data.type === "finish") {
      if (mode === "play") endRound(false);
      return;
    }
    if (data.type === "tone" && window.Switch2Select) {
      Switch2Select.tone(Number(data.freq), Number(data.ms));
    }
  }

  function exactIndex(value) {
    if (value === 0 || value === 1 || value === 2 || value === 3) return value;
    return -1;
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
  window.addEventListener("message", onGameMessage);
  window.addEventListener("pagehide", function () {
    sendControl("resume");
  });
  demo.addEventListener("click", onDemoClick);
  document.addEventListener("keydown", onDemoKey);

  loadConfig(false).then(function (loaded) {
    config = loaded;
    volumeLevel = loaded.volume;
    publishVolume();
    renderFocus(0);
    if (demoMode) speak(portCue(0));
    armAutoScan();
    connectSocket();
  });
})();
