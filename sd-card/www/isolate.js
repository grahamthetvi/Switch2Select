(function () {
  "use strict";

  // Stamp a colored rim around opaque pixels, the same way CVI Book Builder outlines a cut-out.
  function outlineCanvas(source, color, thickness) {
    var radius = Math.max(1, Math.round((Number(thickness) || 1) * 1.15));
    var pad = radius + 2;
    var tint = document.createElement("canvas");
    tint.width = source.width;
    tint.height = source.height;
    var tintCtx = tint.getContext("2d");
    tintCtx.drawImage(source, 0, 0);
    tintCtx.globalCompositeOperation = "source-in";
    tintCtx.fillStyle = color || "#ffff00";
    tintCtx.fillRect(0, 0, tint.width, tint.height);
    tintCtx.globalCompositeOperation = "source-over";

    var out = document.createElement("canvas");
    out.width = source.width + pad * 2;
    out.height = source.height + pad * 2;
    var outCtx = out.getContext("2d");
    var steps = Math.max(16, Math.ceil(2 * Math.PI * radius * 2));
    for (var i = 0; i < steps; i += 1) {
      var angle = (i / steps) * Math.PI * 2;
      outCtx.drawImage(tint, pad + Math.cos(angle) * radius, pad + Math.sin(angle) * radius);
    }
    outCtx.drawImage(source, pad, pad);
    return out;
  }

  function median(values) {
    var copy = values.slice().sort(function (a, b) {
      return a - b;
    });
    return copy[(copy.length / 2) | 0];
  }

  function sampleEdgeColor(imageData) {
    var w = imageData.width;
    var h = imageData.height;
    var data = imageData.data;
    var reds = [];
    var greens = [];
    var blues = [];

    function take(x, y) {
      var offset = (y * w + x) * 4;
      if (data[offset + 3] < 20) return;
      reds.push(data[offset]);
      greens.push(data[offset + 1]);
      blues.push(data[offset + 2]);
    }

    var stepX = Math.max(1, Math.floor(w / 40));
    var stepY = Math.max(1, Math.floor(h / 40));
    var x;
    var y;
    for (x = 0; x < w; x += stepX) {
      take(x, 0);
      take(Math.min(x, w - 1), h - 1);
    }
    for (y = 0; y < h; y += stepY) {
      take(0, y);
      take(w - 1, Math.min(y, h - 1));
    }
    if (reds.length < 8) return null;
    return { r: median(reds), g: median(greens), b: median(blues) };
  }

  function colorClose(data, offset, bg, tolerance) {
    var dr = data[offset] - bg.r;
    var dg = data[offset + 1] - bg.g;
    var db = data[offset + 2] - bg.b;
    if (dr < 0) dr = -dr;
    if (dg < 0) dg = -dg;
    if (db < 0) db = -db;
    return dr + dg + db <= tolerance;
  }

  function removable(data, offset, bg, tolerance) {
    if (data[offset + 3] < 20) return true;
    if (!bg) return false;
    return colorClose(data, offset, bg, tolerance);
  }

  function removeEdgeBackground(imageData, bg, tolerance) {
    var w = imageData.width;
    var h = imageData.height;
    var data = imageData.data;
    var count = w * h;
    var seen = new Uint8Array(count);
    var queue = new Int32Array(count);
    var head = 0;
    var tail = 0;

    function push(index) {
      if (index < 0 || index >= count || seen[index]) return;
      if (!removable(data, index * 4, bg, tolerance)) return;
      seen[index] = 1;
      queue[tail] = index;
      tail += 1;
    }

    var x;
    var y;
    for (x = 0; x < w; x += 1) {
      push(x);
      push((h - 1) * w + x);
    }
    for (y = 0; y < h; y += 1) {
      push(y * w);
      push(y * w + (w - 1));
    }

    while (head < tail) {
      var index = queue[head];
      head += 1;
      data[index * 4 + 3] = 0;
      x = index % w;
      y = (index - x) / w;
      if (x > 0) push(index - 1);
      if (x + 1 < w) push(index + 1);
      if (y > 0) push(index - w);
      if (y + 1 < h) push(index + w);
    }
  }

  function softenFringe(imageData, bg, tolerance) {
    if (!bg) return;
    var w = imageData.width;
    var h = imageData.height;
    var data = imageData.data;
    var pass;
    for (pass = 0; pass < 2; pass += 1) {
      var clear = [];
      var y;
      var x;
      for (y = 0; y < h; y += 1) {
        for (x = 0; x < w; x += 1) {
          var index = y * w + x;
          var offset = index * 4;
          if (data[offset + 3] < 20) continue;
          if (!colorClose(data, offset, bg, tolerance)) continue;
          var exposed = false;
          if (x > 0 && data[(index - 1) * 4 + 3] < 20) exposed = true;
          else if (x + 1 < w && data[(index + 1) * 4 + 3] < 20) exposed = true;
          else if (y > 0 && data[(index - w) * 4 + 3] < 20) exposed = true;
          else if (y + 1 < h && data[(index + w) * 4 + 3] < 20) exposed = true;
          if (exposed) clear.push(offset);
        }
      }
      if (!clear.length) return;
      var i;
      for (i = 0; i < clear.length; i += 1) data[clear[i] + 3] = 0;
    }
  }

  function clearedRatio(imageData) {
    var data = imageData.data;
    var clear = 0;
    var total = imageData.width * imageData.height;
    var i;
    for (i = 3; i < data.length; i += 4) {
      if (data[i] < 20) clear += 1;
    }
    if (!total) return 0;
    return clear / total;
  }

  function copyCanvas(source) {
    var copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext("2d").drawImage(source, 0, 0);
    return copy;
  }

  function loadSource(file, maxEdge) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var width = img.naturalWidth || img.width;
        var height = img.naturalHeight || img.height;
        if (!width || !height) {
          reject(new Error("photo"));
          return;
        }
        var edge = Math.max(width, height);
        var scale = edge > maxEdge ? maxEdge / edge : 1;
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("photo"));
      };
      img.src = url;
    });
  }

  function finish(sourceCanvas, options) {
    var settings = options || {};
    var working = copyCanvas(sourceCanvas);
    var cleared = 0;
    if (settings.removeBackground) {
      var ctx = working.getContext("2d");
      var imageData = ctx.getImageData(0, 0, working.width, working.height);
      var bg = settings.backgroundColor || sampleEdgeColor(imageData);
      var tolerance = Number(settings.tolerance);
      if (!isFinite(tolerance)) tolerance = 60;
      removeEdgeBackground(imageData, bg, tolerance);
      softenFringe(imageData, bg, tolerance);
      ctx.putImageData(imageData, 0, 0);
      cleared = clearedRatio(imageData);
    }
    var canvas = working;
    if (settings.outline) {
      canvas = outlineCanvas(working, settings.outlineColor || "#ffff00", settings.outlinePx);
    }
    return { canvas: canvas, cleared: cleared };
  }

  function toPng(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("png"));
        else resolve(blob);
      }, "image/png");
    });
  }

  window.Switch2SelectIsolate = {
    loadSource: loadSource,
    finish: finish,
    toPng: toPng
  };
})();
