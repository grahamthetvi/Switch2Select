(function () {
  "use strict";

  var portWords = ["one", "two", "three", "four"];
  var form = document.getElementById("setup");
  var choicesRoot = document.getElementById("choices");
  var statusNode = document.getElementById("status");
  var saveButtons = form.querySelectorAll("button.primary");
  var delayWrap = document.getElementById("delay-wrap");
  var delayInput = document.getElementById("scan-delay");
  var pulseInput = document.getElementById("pulse");
  var volumeInput = document.getElementById("volume");
  var volumeValue = document.getElementById("volume-value");
  var ringInput = document.getElementById("ring");
  var ringValue = document.getElementById("ring-value");
  var scanAuto = document.getElementById("scan-auto");
  var scanStep = document.getElementById("scan-step");

  var config = null;
  var choices = [];
  var dirty = false;
  var saving = false;
  var loading = false;
  var volumeTouched = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function labeled(text, field) {
    var label = el("label");
    label.appendChild(document.createTextNode(text));
    label.appendChild(field);
    return label;
  }

  function hexColor(value, fallback) {
    var text = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(text)) return text;
    return fallback;
  }

  function clampScale(value) {
    var number = Math.round(Number(value));
    if (!isFinite(number) || number < 0) return 0;
    if (number > 9) return 9;
    return number;
  }

  function msToSeconds(ms, fallback) {
    var number = Number(ms);
    if (!isFinite(number) || number <= 0) number = fallback;
    return String(Math.round(number / 100) / 10);
  }

  function secondsToMs(value, fallback, minMs, maxMs) {
    var number = Number(value);
    if (!isFinite(number)) return fallback;
    var ms = Math.round(number * 1000);
    if (ms < minMs) return minMs;
    if (ms > maxMs) return maxMs;
    return ms;
  }

  function validPath(path) {
    if (!path) return true;
    if (path.charAt(0) !== "/") return false;
    if (path.indexOf("..") >= 0) return false;
    if (path.length > 63) return false;
    if (/\s/.test(path)) return false;
    return true;
  }

  function channelDistance(a, b) {
    var left = parseInt(String(a).slice(1), 16);
    var right = parseInt(String(b).slice(1), 16);
    if (!isFinite(left) || !isFinite(right)) return 999;
    var dr = ((left >> 16) & 255) - ((right >> 16) & 255);
    var dg = ((left >> 8) & 255) - ((right >> 8) & 255);
    var db = (left & 255) - (right & 255);
    if (dr < 0) dr = -dr;
    if (dg < 0) dg = -dg;
    if (db < 0) db = -db;
    return dr + dg + db;
  }

  function setStatus(text, isError) {
    statusNode.textContent = text || "";
    statusNode.className = isError ? "status error" : "status ok";
  }

  function ringText(level) {
    if (level === 0) return "0, off";
    if (level === 9) return "9, brightest";
    return String(level);
  }

  function setVolumeField(level) {
    var next = clampScale(level);
    volumeInput.value = String(next);
    volumeValue.textContent = String(next);
  }

  function setRingField(level) {
    var next = clampScale(level);
    ringInput.value = String(next);
    ringValue.textContent = ringText(next);
  }

  function syncDelay() {
    delayWrap.hidden = scanStep.checked;
  }

  function addSwatches(input, colors) {
    var row = el("div", "swatches");
    colors.forEach(function (color) {
      var button = el("button", "swatch");
      button.type = "button";
      button.style.background = color;
      button.setAttribute("aria-label", color);
      button.addEventListener("click", function () {
        input.value = color;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      row.appendChild(button);
    });
    return row;
  }

  function colorControl(text, value, swatches) {
    var input = document.createElement("input");
    input.type = "color";
    input.value = hexColor(value, swatches[0]);
    var label = labeled(text, input);
    label.appendChild(addSwatches(input, swatches));
    return { label: label, input: input };
  }

  function fileInput(accept, capture) {
    var input = document.createElement("input");
    input.type = "file";
    input.className = "file-input";
    input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    return input;
  }

  function createChoice(index, option) {
    var source = option && typeof option === "object" ? option : {};
    var imageSrc = source.type === "image" && source.src ? String(source.src) : "";
    var videoSrc = source.type === "video" && source.src ? String(source.src) : "";
    var pendingBlob = null;
    var pendingVideo = null;
    var videoUrl = "";
    var resultUrl = "";
    var sourceCanvas = null;
    var picked = null;
    var outlineTouched = false;
    var processToken = 0;
    var pictureReady = false;
    var videoReady = false;
    var processTimer = 0;

    var card = el("fieldset", "choice");
    card.setAttribute("data-choice", String(index + 1));
    var legend = el("legend", "", "Choice " + (index + 1));
    card.appendChild(legend);

    var labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.maxLength = 47;
    labelInput.required = true;
    labelInput.value = source.label != null ? String(source.label) : "";
    card.appendChild(labeled("Word while scanning", labelInput));

    var phraseInput = document.createElement("input");
    phraseInput.type = "text";
    phraseInput.maxLength = 95;
    phraseInput.value = source.phrase != null ? String(source.phrase) : "";
    var phraseLabel = labeled("Words when chosen", phraseInput);
    phraseLabel.appendChild(el("span", "hint", "Leave this blank to say the scanning word."));
    card.appendChild(phraseLabel);

    var listen = el("button", "secondary", "Listen");
    listen.type = "button";
    card.appendChild(listen);

    var typeSelect = document.createElement("select");
    [
      ["image", "Picture"],
      ["video", "Video"],
      ["game", "Game"],
      ["tts", "Words"]
    ].forEach(function (entry) {
      var item = el("option", "", entry[1]);
      item.value = entry[0];
      typeSelect.appendChild(item);
    });
    var known = source.type === "image" || source.type === "video" || source.type === "game" || source.type === "tts";
    typeSelect.value = known ? source.type : "tts";
    card.appendChild(labeled("On the screen", typeSelect));

    var frame = el("div", "when-chosen");
    var picture = el("img", "picture");
    picture.alt = "";
    var clip = document.createElement("video");
    clip.className = "clip";
    clip.controls = true;
    clip.playsInline = true;
    clip.setAttribute("playsinline", "");
    var word = el("p", "word");
    frame.appendChild(picture);
    frame.appendChild(clip);
    frame.appendChild(word);
    card.appendChild(frame);

    var imagePanel = el("div", "panel");
    var sourceHolder = el("div", "source-holder");
    sourceHolder.hidden = true;
    var tapHint = el("p", "hint", "Tap the background in the photo if the wrong part disappears.");
    tapHint.hidden = true;
    var photoNote = el("p", "hint");
    var take = el("button", "secondary", "Take photo");
    take.type = "button";
    var library = el("button", "secondary", "Choose photo");
    library.type = "button";
    var cameraInput = fileInput("image/*", "environment");
    var libraryInput = fileInput("image/*");
    var removeInput = document.createElement("input");
    removeInput.type = "checkbox";
    removeInput.checked = true;
    var toleranceInput = document.createElement("input");
    toleranceInput.type = "range";
    toleranceInput.min = "15";
    toleranceInput.max = "180";
    toleranceInput.value = "60";
    var outlineInput = document.createElement("input");
    outlineInput.type = "checkbox";
    outlineInput.checked = true;
    var outlineColor = colorControl("Outline color", source.color || "#ffff00", ["#ffff00", "#ff0000", "#ffffff", "#0057d8", "#000000"]);
    var thicknessInput = document.createElement("input");
    thicknessInput.type = "range";
    thicknessInput.min = "2";
    thicknessInput.max = "24";
    thicknessInput.value = "8";
    var thicknessValue = el("span", "", "8");
    var removeLabel = el("label", "check");
    removeLabel.appendChild(removeInput);
    removeLabel.appendChild(document.createTextNode("Remove background"));
    var toleranceLabel = labeled("Background amount", toleranceInput);
    var outlineLabel = el("label", "check");
    outlineLabel.appendChild(outlineInput);
    outlineLabel.appendChild(document.createTextNode("Add an outline"));
    var thicknessLabel = labeled("Outline thickness", thicknessInput);
    thicknessLabel.appendChild(thicknessValue);
    var photoButtons = el("div", "row");
    photoButtons.appendChild(take);
    photoButtons.appendChild(library);
    imagePanel.appendChild(sourceHolder);
    imagePanel.appendChild(tapHint);
    imagePanel.appendChild(photoButtons);
    imagePanel.appendChild(cameraInput);
    imagePanel.appendChild(libraryInput);
    imagePanel.appendChild(removeLabel);
    imagePanel.appendChild(toleranceLabel);
    imagePanel.appendChild(el("p", "hint", "A plain background, such as paper or a table, comes off more cleanly. A busy room may stay in the picture."));
    imagePanel.appendChild(outlineLabel);
    imagePanel.appendChild(outlineColor.label);
    imagePanel.appendChild(thicknessLabel);
    imagePanel.appendChild(photoNote);
    card.appendChild(imagePanel);

    var videoPanel = el("div", "panel");
    var pickVideo = el("button", "secondary", "Choose video");
    pickVideo.type = "button";
    var videoInput = fileInput("video/mp4,video/*");
    var videoNote = el("p", "hint", "Use a short MP4. The device plays MP4 video.");
    videoPanel.appendChild(pickVideo);
    videoPanel.appendChild(videoInput);
    videoPanel.appendChild(videoNote);
    card.appendChild(videoPanel);

    var gamePanel = el("div", "panel");
    var gameInput = document.createElement("input");
    gameInput.type = "text";
    gameInput.maxLength = 63;
    gameInput.placeholder = "/games/look/index.html";
    gameInput.value = source.type === "game" && source.src ? String(source.src) : "";
    var useLook = el("button", "secondary", "Use the Look game");
    useLook.type = "button";
    gamePanel.appendChild(labeled("Page on the card", gameInput));
    gamePanel.appendChild(useLook);
    gamePanel.appendChild(el("p", "hint", "A game is a page already stored on the card. Look shows a yellow shape that grows when this choice is selected."));
    card.appendChild(gamePanel);

    var pulseInputChoice = document.createElement("input");
    pulseInputChoice.type = "checkbox";
    pulseInputChoice.checked = source.pulseOutput === true;
    var pulseLabel = el("label", "check");
    pulseLabel.appendChild(pulseInputChoice);
    pulseLabel.appendChild(document.createTextNode("Close the toy switch"));
    card.appendChild(pulseLabel);

    var background = colorControl("Background", source.background || "#000000", ["#000000", "#ffffff", "#0057d8", "#ffff00", "#ff0000"]);
    var wordColor = colorControl("Word and card light", source.color || "#ffff00", ["#ffff00", "#ffffff", "#ff0000", "#0057d8", "#000000"]);
    card.appendChild(background.label);
    card.appendChild(wordColor.label);
    var contrastNote = el("p", "hint warn");
    contrastNote.hidden = true;
    card.appendChild(contrastNote);
    card.appendChild(el("p", "hint", "Words use this color with a red outline. Yellow on black is the easiest to see. This color also lights the card behind that choice."));

    function setPicture(url) {
      if (url) {
        picture.src = url;
        pictureReady = true;
      } else {
        picture.removeAttribute("src");
        pictureReady = false;
      }
      updateFrame();
    }

    function setClip(url) {
      if (url) {
        clip.src = url;
        videoReady = true;
      } else {
        clip.removeAttribute("src");
        videoReady = false;
      }
      updateFrame();
    }

    function updateContrast() {
      var bg = hexColor(background.input.value, "#000000");
      var fg = hexColor(wordColor.input.value, "#ffff00");
      var messages = [];
      if (channelDistance(fg, "#ff0000") < 120) {
        messages.push("This color matches the red outline, so the letters look solid red.");
      }
      if (channelDistance(fg, bg) < 140) {
        messages.push("The word and the background are very close.");
      }
      contrastNote.hidden = messages.length === 0;
      contrastNote.textContent = messages.join(" ");
    }

    function updateFrame() {
      var type = typeSelect.value;
      frame.style.background = hexColor(background.input.value, "#000000");
      frame.style.color = hexColor(wordColor.input.value, "#ffff00");
      var showPicture = type === "image" && pictureReady;
      var showVideo = type === "video" && videoReady;
      picture.hidden = !showPicture;
      clip.hidden = !showVideo;
      word.hidden = showPicture || showVideo;
      if (!word.hidden) {
        if (type === "tts") word.textContent = phraseInput.value.trim() || labelInput.value.trim() || "Words";
        else word.textContent = labelInput.value.trim() || "Choice";
      }
      imagePanel.hidden = type !== "image";
      videoPanel.hidden = type !== "video";
      gamePanel.hidden = type !== "game";
      updateContrast();
    }

    function showResult(blob) {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      setPicture(resultUrl);
    }

    function processNow() {
      if (!sourceCanvas || !window.Switch2SelectIsolate) return;
      processToken += 1;
      var token = processToken;
      photoNote.textContent = "Working on the photo…";
      var options = {
        removeBackground: removeInput.checked,
        tolerance: Number(toleranceInput.value),
        outline: outlineInput.checked,
        outlineColor: hexColor(outlineColor.input.value, "#ffff00"),
        outlinePx: Number(thicknessInput.value),
        backgroundColor: picked
      };
      window.setTimeout(function () {
        if (token !== processToken) return;
        var result;
        try {
          result = window.Switch2SelectIsolate.finish(sourceCanvas, options);
        } catch (err) {
          photoNote.textContent = "The photo could not be prepared.";
          return;
        }
        window.Switch2SelectIsolate.toPng(result.canvas).then(function (blob) {
          if (token !== processToken) return;
          pendingBlob = blob;
          showResult(blob);
          if (options.removeBackground && result.cleared > 0.9) {
            photoNote.textContent = "Almost the whole photo was removed. Lower the amount, or tap the background.";
          } else if (picked) {
            photoNote.textContent = "Using the color you tapped.";
          } else {
            photoNote.textContent = "Tap the photo if the wrong part disappears.";
          }
        }).catch(function () {
          if (token !== processToken) return;
          photoNote.textContent = "The photo could not be prepared.";
        });
      }, 30);
    }

    function scheduleProcess() {
      if (processTimer) window.clearTimeout(processTimer);
      processTimer = window.setTimeout(processNow, 200);
    }

    function useSource(canvas) {
      if (sourceCanvas && sourceCanvas.parentNode) sourceCanvas.parentNode.removeChild(sourceCanvas);
      sourceCanvas = canvas;
      sourceCanvas.className = "source";
      sourceHolder.hidden = false;
      tapHint.hidden = false;
      sourceHolder.appendChild(sourceCanvas);
      sourceCanvas.addEventListener("click", function (event) {
        var rect = sourceCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var x = Math.round((event.clientX - rect.left) * (sourceCanvas.width / rect.width));
        var y = Math.round((event.clientY - rect.top) * (sourceCanvas.height / rect.height));
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x >= sourceCanvas.width) x = sourceCanvas.width - 1;
        if (y >= sourceCanvas.height) y = sourceCanvas.height - 1;
        var pixel = sourceCanvas.getContext("2d").getImageData(x, y, 1, 1).data;
        picked = { r: pixel[0], g: pixel[1], b: pixel[2] };
        processNow();
      });
    }

    function onPhoto(file) {
      if (!file || !window.Switch2SelectIsolate) return;
      photoNote.textContent = "Opening the photo…";
      window.Switch2SelectIsolate.loadSource(file, 720).then(function (canvas) {
        picked = null;
        pendingBlob = null;
        useSource(canvas);
        processNow();
      }).catch(function () {
        photoNote.textContent = "This photo could not be opened. Choose a JPEG or PNG.";
      });
    }

    function onVideo(file) {
      if (!file) return;
      var name = file.name || "";
      var mp4 = /\.mp4$/i.test(name) || file.type === "video/mp4";
      if (!mp4) {
        videoNote.textContent = "The device plays MP4 video. Export this clip as an MP4 and choose it again.";
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        videoNote.textContent = "This video is over 12 MB. Choose a shorter clip.";
        return;
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      pendingVideo = file;
      videoUrl = URL.createObjectURL(file);
      setClip(videoUrl);
      videoNote.textContent = file.size > 4 * 1024 * 1024
        ? "This video is large. Saving may take a minute."
        : "This MP4 will be saved with the choice.";
    }

    take.addEventListener("click", function () { cameraInput.click(); });
    library.addEventListener("click", function () { libraryInput.click(); });
    cameraInput.addEventListener("change", function () {
      var file = cameraInput.files && cameraInput.files[0];
      onPhoto(file);
      cameraInput.value = "";
    });
    libraryInput.addEventListener("change", function () {
      var file = libraryInput.files && libraryInput.files[0];
      onPhoto(file);
      libraryInput.value = "";
    });
    pickVideo.addEventListener("click", function () { videoInput.click(); });
    videoInput.addEventListener("change", function () {
      var file = videoInput.files && videoInput.files[0];
      onVideo(file);
      videoInput.value = "";
    });
    useLook.addEventListener("click", function () {
      gameInput.value = "/games/look/index.html";
      gameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    listen.addEventListener("click", function () {
      if (!window.speechSynthesis) return;
      var fields = collect();
      var text = fields.type === "tts" && fields.phrase
        ? fields.phrase
        : "Port " + portWords[index] + ", " + fields.label;
      if (!text) return;
      var utterance = new SpeechSynthesisUtterance(text);
      var level = clampScale(volumeInput.value);
      utterance.volume = level === 0 ? 0 : level / 9;
      utterance.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });

    [removeInput, outlineInput].forEach(function (input) {
      input.addEventListener("change", scheduleProcess);
    });
    [toleranceInput, thicknessInput, outlineColor.input].forEach(function (input) {
      input.addEventListener("input", function () {
        if (input === thicknessInput) thicknessValue.textContent = thicknessInput.value;
        if (input === outlineColor.input) outlineTouched = true;
        scheduleProcess();
      });
    });
    wordColor.input.addEventListener("input", function () {
      if (!outlineTouched) outlineColor.input.value = wordColor.input.value;
      updateFrame();
      if (sourceCanvas) scheduleProcess();
    });
    [labelInput, phraseInput, typeSelect, background.input, pulseInputChoice].forEach(function (input) {
      input.addEventListener("input", updateFrame);
      input.addEventListener("change", updateFrame);
    });

    if (imageSrc) setPicture(imageSrc + (imageSrc.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now());
    if (videoSrc) setClip(videoSrc + (videoSrc.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now());
    updateFrame();

    function collect() {
      var type = typeSelect.value;
      var path = "";
      if (type === "image") path = imageSrc;
      else if (type === "video") path = videoSrc;
      else if (type === "game") path = gameInput.value.trim();
      return {
        label: labelInput.value.trim().slice(0, 47),
        phrase: phraseInput.value.trim().slice(0, 95),
        type: type,
        src: path.slice(0, 63),
        background: hexColor(background.input.value, "#000000"),
        color: hexColor(wordColor.input.value, "#ffff00"),
        pulseOutput: pulseInputChoice.checked
      };
    }

    function problem() {
      if (!labelInput.value.trim()) return "Choice " + (index + 1) + " needs a word.";
      var path = collect().src;
      if (!validPath(path)) {
        return "Choice " + (index + 1) + " has a page path the device cannot use. Start it with / and keep it short.";
      }
      return "";
    }

    function needsUpload() {
      var type = typeSelect.value;
      return (type === "image" && !!pendingBlob) || (type === "video" && !!pendingVideo);
    }

    function upload() {
      var type = typeSelect.value;
      if (type === "image" && pendingBlob) {
        return postMedia(index + 1, "png", pendingBlob).then(function (path) {
          pendingBlob = null;
          imageSrc = path;
        });
      }
      if (type === "video" && pendingVideo) {
        return postMedia(index + 1, "mp4", pendingVideo).then(function (path) {
          pendingVideo = null;
          videoSrc = path;
        });
      }
      return Promise.resolve();
    }

    choicesRoot.appendChild(card);
    return {
      collect: collect,
      problem: problem,
      needsUpload: needsUpload,
      upload: upload
    };
  }

  function postMedia(slot, ext, blob) {
    var body = new FormData();
    body.append("file", blob, slot + "." + ext);
    return fetch("/api/media?slot=" + slot + "&ext=" + ext, {
      method: "POST",
      body: body,
      cache: "no-store"
    }).then(function (response) {
      if (!response.ok) throw new Error("upload");
      return response.json();
    }).then(function (data) {
      if (!data || typeof data.src !== "string" || !data.src) throw new Error("upload");
      return data.src;
    });
  }

  function timingProblem() {
    var seconds = Number(delayInput.value);
    if (!scanStep.checked && (!isFinite(seconds) || seconds < 1 || seconds > 30)) {
      return "Seconds on each choice needs to be from 1 to 30.";
    }
    var pulse = Number(pulseInput.value);
    if (!isFinite(pulse) || pulse < 0.2 || pulse > 10) {
      return "Toy time needs to be from 0.2 to 10 seconds.";
    }
    return "";
  }

  function volumeForSave() {
    if (volumeTouched) return Promise.resolve(clampScale(volumeInput.value));
    return fetch("/config.json", { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("config");
      return response.json();
    }).then(function (data) {
      return clampScale(data && data.volume);
    }).catch(function () {
      return clampScale(volumeInput.value);
    });
  }

  function save() {
    if (saving || !config) return;
    var timing = timingProblem();
    if (timing) {
      setStatus(timing, true);
      return;
    }
    var i;
    for (i = 0; i < choices.length; i += 1) {
      var issue = choices[i].problem();
      if (issue) {
        setStatus(issue, true);
        return;
      }
    }
    saving = true;
    setSaving(true);
    setStatus("Saving…", false);
    var chain = Promise.resolve();
    choices.forEach(function (choice, index) {
      chain = chain.then(function () {
        if (choice.needsUpload()) setStatus("Saving the file for choice " + (index + 1) + "…", false);
        return choice.upload();
      });
    });
    chain.then(volumeForSave).then(function (volume) {
      config.scanMode = scanStep.checked ? "step" : "auto";
      config.scanDelayMs = secondsToMs(delayInput.value, 3000, 1000, 30000);
      config.outputPulseMs = secondsToMs(pulseInput.value, 1000, 200, 10000);
      config.volume = volume;
      config.ringLevel = clampScale(ringInput.value);
      choices.forEach(function (choice, index) {
        var fields = choice.collect();
        var target = config.options[index];
        target.label = fields.label;
        target.phrase = fields.phrase;
        target.type = fields.type;
        target.src = fields.src;
        target.background = fields.background;
        target.color = fields.color;
        target.pulseOutput = fields.pulseOutput;
      });
      return fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
        cache: "no-store"
      });
    }).then(function (response) {
      if (!response.ok) throw new Error("save");
      dirty = false;
      setStatus("Saved. The student screen is using this now.", false);
    }).catch(function () {
      setStatus("Setup could not be saved. Join the Switch2Select Wi-Fi and open this page from the device.", true);
    }).then(function () {
      saving = false;
      setSaving(false);
      statusNode.scrollIntoView({ block: "nearest" });
    });
  }

  function setSaving(disabled) {
    var i;
    for (i = 0; i < saveButtons.length; i += 1) saveButtons[i].disabled = disabled;
  }

  function connectVolume() {
    if (window.location.protocol === "file:") return;
    var socket;
    try {
      socket = new WebSocket("ws://" + window.location.hostname + ":81");
    } catch (err) {
      return;
    }
    socket.onmessage = function (event) {
      if (volumeTouched) return;
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      if (!message || typeof message.type !== "string") return;
      if (message.type === "volume" && message.level != null) setVolumeField(message.level);
      if (message.type === "hello" && message.volume != null) setVolumeField(message.volume);
    };
  }

  function fill(data) {
    loading = true;
    scanAuto.checked = data.scanMode !== "step";
    scanStep.checked = data.scanMode === "step";
    delayInput.value = msToSeconds(data.scanDelayMs, 3000);
    pulseInput.value = msToSeconds(data.outputPulseMs, 1000);
    setVolumeField(data.volume == null ? 5 : data.volume);
    setRingField(data.ringLevel == null ? 4 : data.ringLevel);
    syncDelay();
    choicesRoot.textContent = "";
    choices = [];
    var i;
    for (i = 0; i < 4; i += 1) {
      choices.push(createChoice(i, data.options[i]));
    }
    loading = false;
    dirty = false;
    volumeTouched = false;
  }

  scanAuto.addEventListener("change", syncDelay);
  scanStep.addEventListener("change", syncDelay);
  volumeInput.addEventListener("input", function () {
    volumeTouched = true;
    volumeValue.textContent = String(clampScale(volumeInput.value));
  });
  ringInput.addEventListener("input", function () {
    ringValue.textContent = ringText(clampScale(ringInput.value));
  });
  form.addEventListener("input", function () {
    if (!loading) dirty = true;
  });
  form.addEventListener("change", function () {
    if (!loading) dirty = true;
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    save();
  });
  document.getElementById("back").addEventListener("click", function (event) {
    if (!dirty) return;
    if (!window.confirm("Leave without saving the setup?")) event.preventDefault();
  });

  fetch("/config.json", { cache: "no-store" }).then(function (response) {
    if (!response.ok) throw new Error("missing");
    return response.json();
  }).then(function (data) {
    if (!data || !Array.isArray(data.options) || data.options.length !== 4) throw new Error("bad");
    config = data;
    fill(data);
    connectVolume();
  }).catch(function () {
    setStatus("The setup on the card could not be read.", true);
  });
})();
