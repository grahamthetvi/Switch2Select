/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire.
 * This file is original, not copied from that firmware.
 */

#include "web.h"

#include <Arduino.h>

#include "device.h"

#include <SD.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <WiFi.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

static const size_t kMaxPath = 256;
static const size_t kChunkSize = 4096;

static WebServer http(80);
static WebSocketsServer webSocket(81);
static const char *kCollectedHeaders[] = {"Range"};

struct MimeType {
  const char *extension;
  const char *type;
  bool noCache;
};

static const MimeType kMimeTypes[] = {
    {".html", "text/html", true},
    {".css", "text/css", false},
    {".js", "text/javascript", false},
    {".json", "application/json", true},
    {".svg", "image/svg+xml", false},
    {".mp4", "video/mp4", false},
    {".wav", "audio/wav", false},
    {".png", "image/png", false},
    {".jpg", "image/jpeg", false},
    {".jpeg", "image/jpeg", false},
};

static void mimeForPath(const char *path, const char **type, bool *noCache) {
  *type = "application/octet-stream";
  *noCache = false;
  const char *dot = strrchr(path, '.');
  if (dot == nullptr) {
    return;
  }
  for (size_t i = 0; i < sizeof(kMimeTypes) / sizeof(kMimeTypes[0]); i++) {
    if (strcasecmp(dot, kMimeTypes[i].extension) == 0) {
      *type = kMimeTypes[i].type;
      *noCache = kMimeTypes[i].noCache;
      return;
    }
  }
}

static bool isRangeDelimiter(char c) {
  return c == '\0' || c == ',' || c == ' ' || c == '\t';
}

// HTTP byte ranges are inclusive. An omitted end means through the last byte.
// Returns false when the range cannot be satisfied.
static bool parseByteRange(const char *header, size_t fileSize, size_t *startOut, size_t *endOut) {
  const char *spec = header + strlen("bytes=");
  const char *dash = strchr(spec, '-');
  if (dash == nullptr || fileSize == 0) {
    return false;
  }

  char startText[16];
  size_t startLen = static_cast<size_t>(dash - spec);
  if (startLen >= sizeof(startText)) {
    return false;
  }
  memcpy(startText, spec, startLen);
  startText[startLen] = '\0';

  char endText[16];
  const char *endSpec = dash + 1;
  size_t endLen = 0;
  while (!isRangeDelimiter(endSpec[endLen]) && endLen + 1 < sizeof(endText)) {
    endText[endLen] = endSpec[endLen];
    endLen++;
  }
  if (!isRangeDelimiter(endSpec[endLen])) {
    return false;
  }
  endText[endLen] = '\0';

  if (startText[0] == '\0' && endText[0] == '\0') {
    return false;
  }

  if (startText[0] == '\0') {
    char *endPtr = nullptr;
    unsigned long suffix = strtoul(endText, &endPtr, 10);
    if (endPtr == endText || *endPtr != '\0' || suffix == 0) {
      return false;
    }
    if (suffix > fileSize) {
      suffix = fileSize;
    }
    *startOut = fileSize - static_cast<size_t>(suffix);
    *endOut = fileSize - 1;
    return true;
  }

  char *endPtr = nullptr;
  unsigned long start = strtoul(startText, &endPtr, 10);
  if (endPtr == startText || *endPtr != '\0' || start >= fileSize) {
    return false;
  }

  unsigned long end = fileSize - 1;
  if (endText[0] != '\0') {
    end = strtoul(endText, &endPtr, 10);
    if (endPtr == endText || *endPtr != '\0' || start > end) {
      return false;
    }
    if (end >= fileSize) {
      end = fileSize - 1;
    }
  }

  *startOut = static_cast<size_t>(start);
  *endOut = static_cast<size_t>(end);
  return true;
}

static void sendRangeNotSatisfiable(size_t fileSize) {
  char contentRange[40];
  snprintf(contentRange, sizeof(contentRange), "bytes */%lu", static_cast<unsigned long>(fileSize));
  http.sendHeader("Content-Range", contentRange);
  http.sendHeader("Accept-Ranges", "bytes");
  http.send(416, "text/plain", "Range not satisfiable");
}

static void writeFileSlice(File &file, size_t length) {
  static uint8_t chunk[kChunkSize];
  size_t remaining = length;
  while (remaining > 0 && http.client().connected()) {
    size_t ask = remaining < sizeof(chunk) ? remaining : sizeof(chunk);
    // File::read is size_t and returns SIZE_MAX ((size_t)-1) on failure.
    size_t got = file.read(chunk, ask);
    if (got == 0 || got > ask) {
      break;
    }
    http.sendContent(reinterpret_cast<const char *>(chunk), got);
    remaining -= got;
    yield();
  }
}

static void serveFile(const char *path, HTTPMethod method) {
  File file = SD.open(path, FILE_READ);
  if (!file || file.isDirectory()) {
    if (file) {
      file.close();
    }
    http.send(404, "text/plain", "Not found");
    return;
  }

  const char *contentType = nullptr;
  bool noCache = false;
  mimeForPath(path, &contentType, &noCache);

  size_t fileSize = file.size();
  size_t start = 0;
  size_t end = 0;
  bool partial = false;

  if (http.hasHeader("Range")) {
    String rangeHeader = http.header("Range");
    if (strncmp(rangeHeader.c_str(), "bytes=", 6) == 0) {
      partial = true;
      if (!parseByteRange(rangeHeader.c_str(), fileSize, &start, &end)) {
        file.close();
        sendRangeNotSatisfiable(fileSize);
        return;
      }
    }
  }

  if (!partial) {
    if (fileSize == 0) {
      http.sendHeader("Accept-Ranges", "bytes");
      if (noCache) {
        http.sendHeader("Cache-Control", "no-cache");
      }
      http.setContentLength(0);
      http.send(200, contentType, "");
      file.close();
      return;
    }
    start = 0;
    end = fileSize - 1;
  }

  if (!file.seek(start)) {
    file.close();
    http.send(500, "text/plain", "Seek failed");
    return;
  }

  size_t contentLength = end - start + 1;
  char contentRange[64];
  contentRange[0] = '\0';
  if (partial) {
    snprintf(contentRange, sizeof(contentRange), "bytes %lu-%lu/%lu",
             static_cast<unsigned long>(start), static_cast<unsigned long>(end),
             static_cast<unsigned long>(fileSize));
  }

  http.sendHeader("Accept-Ranges", "bytes");
  if (partial) {
    http.sendHeader("Content-Range", contentRange);
  }
  if (noCache) {
    http.sendHeader("Cache-Control", "no-cache");
  }
  http.setContentLength(contentLength);
  http.send(partial ? 206 : 200, contentType, "");

  if (method == HTTP_GET && contentLength > 0) {
    writeFileSlice(file, contentLength);
  }
  file.close();
}

static void handleHttp() {
  HTTPMethod method = http.method();
  if (method != HTTP_GET && method != HTTP_HEAD) {
    http.send(405, "text/plain", "Method not allowed");
    return;
  }

  String decoded = WebServer::urlDecode(http.uri());
  if (decoded.length() >= kMaxPath) {
    http.send(414, "text/plain", "URI too long");
    return;
  }

  char path[kMaxPath];
  memcpy(path, decoded.c_str(), decoded.length() + 1);

  if (strcmp(path, "/") == 0) {
    http.sendHeader("Location", "/www/index.html");
    http.send(302, "text/plain", "");
    return;
  }

  if (path[0] != '/' || strstr(path, "..") != nullptr) {
    http.send(400, "text/plain", "Bad path");
    return;
  }

  serveFile(path, method);
}

static void sendHello(uint8_t clientNum) {
  char message[64];
  snprintf(message, sizeof(message), "{\"type\":\"hello\",\"index\":%u,\"volume\":%u}",
           static_cast<unsigned>(focusIndex), static_cast<unsigned>(settings.volume));
  webSocket.sendTXT(clientNum, message);
}

static void onWebSocketEvent(uint8_t clientNum, WStype_t type, uint8_t *payload, size_t length) {
  (void)payload;
  (void)length;
  if (type == WStype_CONNECTED) {
    sendHello(clientNum);
  }
}

bool anyWebSocketClient() {
  for (uint8_t client = 0; client < WEBSOCKETS_SERVER_CLIENT_MAX; client++) {
    if (webSocket.clientIsConnected(client)) {
      return true;
    }
  }
  return false;
}

void broadcastFocus(uint8_t index) {
  char message[48];
  snprintf(message, sizeof(message), "{\"type\":\"focus\",\"index\":%u}", static_cast<unsigned>(index));
  webSocket.broadcastTXT(message);
}

void broadcastSelect(uint8_t index) {
  char message[48];
  snprintf(message, sizeof(message), "{\"type\":\"select\",\"index\":%u}", static_cast<unsigned>(index));
  webSocket.broadcastTXT(message);
}

void broadcastVolume(uint8_t level) {
  char message[48];
  snprintf(message, sizeof(message), "{\"type\":\"volume\",\"level\":%u}", static_cast<unsigned>(level));
  webSocket.broadcastTXT(message);
}

void broadcastInteract(uint8_t index) {
  char message[56];
  snprintf(message, sizeof(message), "{\"type\":\"interact\",\"index\":%u}", static_cast<unsigned>(index));
  webSocket.broadcastTXT(message);
}

void webBegin() {
  Serial.begin(115200);
  WiFi.mode(WIFI_AP);
  WiFi.softAP("Switch2Select");
  Serial.println(WiFi.softAPIP());

  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);

  http.collectHeaders(kCollectedHeaders, sizeof(kCollectedHeaders) / sizeof(kCollectedHeaders[0]));
  http.onNotFound(handleHttp);
  http.begin();
}

void webLoop() {
  webSocket.loop();
  http.handleClient();
}
