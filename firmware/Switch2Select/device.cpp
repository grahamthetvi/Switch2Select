/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * This program is free software under GPL-3.0-or-later.
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire, but this file is not derived from that firmware.
 * The DFRobot Speech Synthesis V2 library, if used, is MIT licensed. Copyright (c) DFRobot Co.Ltd.
 */

#include "device.h"
#include "pins.h"

#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include <DFRobot_SpeechSynthesis_V2.h>
#include <SD.h>
#include <SPI.h>
#include <esp_timer.h>

#include <stdio.h>
#include <string.h>

// Defined by web.cpp.
extern bool anyWebSocketClient();
extern void broadcastFocus(uint8_t index);
extern void broadcastSelect(uint8_t index);
extern void broadcastVolume(uint8_t level);
extern void broadcastInteract(uint8_t index);
extern void broadcastConfig();

Settings settings;
uint8_t focusIndex = 0;

namespace {

constexpr uint8_t kOptionCount = 4;
constexpr uint8_t kInputCount = 8;
constexpr uint32_t kDebounceMs = 40;
constexpr uint32_t kDefaultScanDelayMs = 3000;
constexpr uint32_t kDefaultPulseMs = 1000;
constexpr uint8_t kRelayOffSlots = 2;
constexpr uint8_t kDefaultVolume = 5;
constexpr uint8_t kDefaultRingLevel = 4;
constexpr uint8_t kRingLeds = 7;
constexpr uint8_t kRingBrightness[10] = {0, 16, 28, 40, 56, 72, 96, 120, 150, 180};
constexpr uint32_t kSpeechBaud = 115200;
constexpr size_t kConfigCapacity = 4096;

constexpr uint8_t kInputScan = 4;
constexpr uint8_t kInputVolumeUp = 5;
constexpr uint8_t kInputVolumeDown = 6;
constexpr uint8_t kInputDevice = 7;

constexpr char kConfigPath[] = "/config.json";

const char *const kDefaultLabels[kOptionCount] = {"One", "Two", "Three", "Four"};

const uint8_t kRelayPins[kOptionCount] = {
    PIN_RELAY_0, PIN_RELAY_1, PIN_RELAY_2, PIN_RELAY_3};
const char *const kPortWords[kOptionCount] = {"one", "two", "three", "four"};

Adafruit_NeoPixel rings(kOptionCount * kRingLeds, PIN_RING_DATA, NEO_GRB | NEO_KHZ800);

struct InputDebounce {
  uint8_t pin;
  bool usePullup;
  bool stablePressed;
  bool lastSamplePressed;
  uint32_t lastChangeMs;
};

InputDebounce inputs[kInputCount] = {
    {PIN_OPTION_0, false, false, false, 0},
    {PIN_OPTION_1, false, false, false, 0},
    {PIN_OPTION_2, false, false, false, 0},
    {PIN_OPTION_3, false, false, false, 0},
    {PIN_SCAN, true, false, false, 0},
    {PIN_VOLUME_UP, true, false, false, 0},
    {PIN_VOLUME_DOWN, true, false, false, 0},
    {PIN_DEVICE, true, false, false, 0},
};

DynamicJsonDocument configDoc(kConfigCapacity);
bool sdReady = false;

DFRobot_SpeechSynthesis_UART ss;
bool speechReady = false;

volatile int8_t pulsedRelay = -1;
uint32_t relayOffAtMs = 0;

// speak() blocks the loop task. Each slot remembers the pulse that armed it so a
// late callback cannot open a newer selection. Browsers never arm these timers.
struct RelayOffEvent {
  uint32_t epoch;
  uint8_t pin;
};

RelayOffEvent relayOffEvents[kRelayOffSlots] = {};
esp_timer_handle_t relayOffTimers[kRelayOffSlots] = {nullptr, nullptr};
uint8_t relayOffSlot = 0;
volatile uint32_t relayEpoch = 1;
portMUX_TYPE relayMux = portMUX_INITIALIZER_UNLOCKED;

bool scanTimerArmed = false;
uint32_t scanDueMs = 0;

void setText(char *dest, size_t destSize, const char *text) {
  if (destSize == 0) {
    return;
  }
  if (text == nullptr) {
    text = "";
  }
  strncpy(dest, text, destSize - 1);
  dest[destSize - 1] = '\0';
}

uint8_t optionSlot(uint8_t index) {
  return static_cast<uint8_t>(index % kOptionCount);
}

void copyJsonText(char *dest, size_t destSize, JsonVariantConst value, const char *fallback) {
  const char *text = fallback;
  if (!value.isNull() && value.is<const char *>()) {
    const char *parsed = value.as<const char *>();
    if (parsed != nullptr) {
      text = parsed;
    }
  }
  setText(dest, destSize, text);
}

uint32_t readU32(JsonVariantConst value, uint32_t fallback) {
  if (value.isNull()) {
    return fallback;
  }
  const long parsed = value.as<long>();
  if (parsed < 0) {
    return fallback;
  }
  return static_cast<uint32_t>(parsed);
}

uint8_t readScale(JsonVariantConst value, uint8_t fallback) {
  if (value.isNull()) {
    return fallback;
  }
  long parsed = value.as<long>();
  if (parsed < 0) {
    parsed = 0;
  }
  if (parsed > 9) {
    parsed = 9;
  }
  return static_cast<uint8_t>(parsed);
}

bool readFlag(JsonVariantConst value, bool fallback) {
  if (value.is<bool>()) {
    return value.as<bool>();
  }
  if (value.is<int>()) {
    return value.as<int>() != 0;
  }
  return fallback;
}

void onRelayOffTimer(void *arg) {
  const RelayOffEvent *event = static_cast<const RelayOffEvent *>(arg);
  if (event == nullptr) {
    return;
  }
  portENTER_CRITICAL(&relayMux);
  const uint32_t epoch = event->epoch;
  const uint8_t pin = event->pin;
  if (epoch == relayEpoch) {
    digitalWrite(pin, HIGH);
    const int8_t index = pulsedRelay;
    if (index >= 0 && static_cast<uint8_t>(index) < kOptionCount && kRelayPins[index] == pin) {
      pulsedRelay = -1;
    }
  }
  portEXIT_CRITICAL(&relayMux);
}

void stopRelayOffTimers() {
  for (uint8_t slot = 0; slot < kRelayOffSlots; slot++) {
    if (relayOffTimers[slot] != nullptr) {
      esp_timer_stop(relayOffTimers[slot]);
    }
  }
}

void beginRelayOffTimers() {
  for (uint8_t slot = 0; slot < kRelayOffSlots; slot++) {
    esp_timer_create_args_t args = {};
    args.callback = &onRelayOffTimer;
    args.arg = &relayOffEvents[slot];
    args.dispatch_method = ESP_TIMER_TASK;
    args.name = slot == 0 ? "relayOff0" : "relayOff1";
    if (esp_timer_create(&args, &relayOffTimers[slot]) != ESP_OK) {
      relayOffTimers[slot] = nullptr;
    }
  }
}

void relaysAllOff() {
  stopRelayOffTimers();
  portENTER_CRITICAL(&relayMux);
  relayEpoch++;
  if (relayEpoch == 0) {
    relayEpoch = 1;
  }
  for (uint8_t i = 0; i < kOptionCount; i++) {
    digitalWrite(kRelayPins[i], HIGH);
  }
  pulsedRelay = -1;
  portEXIT_CRITICAL(&relayMux);
}

// Latch the coils off before the pins become outputs so a reset cannot pulse a toy.
void holdRelaysOff() {
  for (uint8_t i = 0; i < kOptionCount; i++) {
    digitalWrite(kRelayPins[i], HIGH);
    pinMode(kRelayPins[i], OUTPUT);
    digitalWrite(kRelayPins[i], HIGH);
  }
  pulsedRelay = -1;
}

int hexNibble(char c) {
  if (c >= '0' && c <= '9') {
    return c - '0';
  }
  if (c >= 'a' && c <= 'f') {
    return c - 'a' + 10;
  }
  if (c >= 'A' && c <= 'F') {
    return c - 'A' + 10;
  }
  return -1;
}

uint32_t colorFromOption(uint8_t index) {
  const char *text = settings.options[index].color;
  if (text[0] == '#') {
    text++;
  }
  int nibbles[6];
  for (uint8_t i = 0; i < 6; i++) {
    nibbles[i] = hexNibble(text[i]);
    if (nibbles[i] < 0) {
      return rings.Color(255, 220, 0);
    }
  }
  const uint8_t red = static_cast<uint8_t>((nibbles[0] << 4) | nibbles[1]);
  const uint8_t green = static_cast<uint8_t>((nibbles[2] << 4) | nibbles[3]);
  const uint8_t blue = static_cast<uint8_t>((nibbles[4] << 4) | nibbles[5]);
  return rings.Color(red, green, blue);
}

void driveRings() {
  const uint8_t level = settings.ringLevel;
  rings.setBrightness(kRingBrightness[level]);
  rings.clear();
  if (level > 0) {
    const uint8_t slot = optionSlot(focusIndex);
    const uint16_t start = static_cast<uint16_t>(slot) * kRingLeds;
    rings.fill(colorFromOption(slot), start, kRingLeds);
  }
  rings.show();
}

void beginRings() {
  rings.begin();
  driveRings();
}

void beginInputs() {
  const uint32_t now = millis();
  for (uint8_t i = 0; i < kInputCount; i++) {
    pinMode(inputs[i].pin, inputs[i].usePullup ? INPUT_PULLUP : INPUT);
    const bool pressed = digitalRead(inputs[i].pin) == LOW;
    inputs[i].stablePressed = pressed;
    inputs[i].lastSamplePressed = pressed;
    inputs[i].lastChangeMs = now;
  }
}

bool pressedEdge(uint8_t index) {
  InputDebounce &input = inputs[index];
  const bool pressed = digitalRead(input.pin) == LOW;
  const uint32_t now = millis();
  if (pressed != input.lastSamplePressed) {
    input.lastSamplePressed = pressed;
    input.lastChangeMs = now;
  }
  if (pressed == input.stablePressed) {
    return false;
  }
  if ((now - input.lastChangeMs) < kDebounceMs) {
    return false;
  }
  input.stablePressed = pressed;
  return pressed;
}

void serviceRelay() {
  if (pulsedRelay < 0) {
    return;
  }
  if (static_cast<int32_t>(millis() - relayOffAtMs) >= 0) {
    relaysAllOff();
  }
}

void startRelayPulse(uint8_t index) {
  relaysAllOff();
  if (index >= kOptionCount || !settings.options[index].pulseOutput) {
    return;
  }
  const uint32_t offAtMs = millis() + settings.outputPulseMs;
  portENTER_CRITICAL(&relayMux);
  digitalWrite(kRelayPins[index], LOW);
  pulsedRelay = static_cast<int8_t>(index);
  relayOffAtMs = offAtMs;
  portEXIT_CRITICAL(&relayMux);
}

// Arm only for a blocking speak(). The browser path leaves the millis deadline to serviceRelay().
void armRelayOffTimer() {
  if (pulsedRelay < 0) {
    return;
  }
  const int32_t remainingMs = static_cast<int32_t>(relayOffAtMs - millis());
  if (remainingMs <= 0) {
    relaysAllOff();
    return;
  }

  stopRelayOffTimers();
  uint8_t slot = relayOffSlot;
  if (relayOffTimers[slot] == nullptr) {
    slot ^= 1;
  }
  esp_timer_handle_t timer = relayOffTimers[slot];
  if (timer == nullptr) {
    delay(static_cast<uint32_t>(remainingMs));
    relaysAllOff();
    return;
  }
  relayOffSlot = static_cast<uint8_t>(slot ^ 1);

  portENTER_CRITICAL(&relayMux);
  const int8_t index = pulsedRelay;
  if (index < 0 || static_cast<uint8_t>(index) >= kOptionCount) {
    portEXIT_CRITICAL(&relayMux);
    return;
  }
  relayOffEvents[slot].epoch = relayEpoch;
  relayOffEvents[slot].pin = kRelayPins[index];
  portEXIT_CRITICAL(&relayMux);

  const uint64_t timeoutUs = static_cast<uint64_t>(remainingMs) * 1000ULL;
  if (esp_timer_start_once(timer, timeoutUs) != ESP_OK) {
    delay(static_cast<uint32_t>(remainingMs));
    relaysAllOff();
  }
}

bool autoScanEnabled() {
  return strcmp(settings.scanMode, "step") != 0;
}

void armScanTimer() {
  scanDueMs = millis() + settings.scanDelayMs;
  scanTimerArmed = true;
}

void beginSpeech() {
  Serial2.begin(kSpeechBaud, SERIAL_8N1, PIN_SPEECH_RX, PIN_SPEECH_TX);
  speechReady = ss.begin(Serial2);
  if (speechReady) {
    ss.setVolume(settings.volume);
  }
}

void speakIfLocal(const char *text) {
  if (!speechReady || anyWebSocketClient()) {
    return;
  }
  if (text == nullptr || text[0] == '\0') {
    return;
  }
  armRelayOffTimer();
  ss.speak(String(text));
}

void speakPort(uint8_t index, const char *tail) {
  char line[160];
  const char *port = kPortWords[optionSlot(index)];
  if (tail == nullptr || tail[0] == '\0') {
    snprintf(line, sizeof(line), "Port %s", port);
  } else {
    snprintf(line, sizeof(line), "Port %s, %s", port, tail);
  }
  speakIfLocal(line);
}

void speakSelection(uint8_t index) {
  const Option &option = settings.options[index];
  const char *text = option.phrase[0] != '\0' ? option.phrase : option.label;
  speakPort(index, text);
}

void showFocus(uint8_t index) {
  focusIndex = optionSlot(index);
  driveRings();
}

void selectOption(uint8_t index) {
  const uint8_t slot = optionSlot(index);
  showFocus(slot);
  startRelayPulse(slot);
  broadcastSelect(slot);
  speakSelection(slot);
  if (autoScanEnabled()) {
    armScanTimer();
  }
}

void advanceFocus() {
  showFocus(static_cast<uint8_t>((optionSlot(focusIndex) + 1) % kOptionCount));
  broadcastFocus(focusIndex);
  speakPort(focusIndex, settings.options[focusIndex].label);
  if (autoScanEnabled()) {
    armScanTimer();
  }
}

void readSettingsFromDoc() {
  // Const views do not insert nulls, so a later volume save still round-trips unknown keys.
  const JsonObjectConst root = configDoc.as<JsonObjectConst>();

  const char *modeText = "auto";
  const JsonVariantConst mode = root["scanMode"];
  if (!mode.isNull() && mode.is<const char *>()) {
    const char *parsed = mode.as<const char *>();
    if (parsed != nullptr && strcmp(parsed, "step") == 0) {
      modeText = "step";
    }
  }
  setText(settings.scanMode, sizeof(settings.scanMode), modeText);

  const uint32_t delayMs = readU32(root["scanDelayMs"], kDefaultScanDelayMs);
  settings.scanDelayMs = delayMs == 0 ? kDefaultScanDelayMs : delayMs;
  settings.outputPulseMs = readU32(root["outputPulseMs"], kDefaultPulseMs);
  settings.volume = readScale(root["volume"], kDefaultVolume);
  settings.ringLevel = readScale(root["ringLevel"], kDefaultRingLevel);

  const JsonArrayConst options = root["options"].as<JsonArrayConst>();
  for (uint8_t i = 0; i < kOptionCount; i++) {
    Option &option = settings.options[i];
    const JsonObjectConst entry = options[i].as<JsonObjectConst>();
    copyJsonText(option.label, sizeof(option.label), entry["label"], kDefaultLabels[i]);
    copyJsonText(option.phrase, sizeof(option.phrase), entry["phrase"], "");
    copyJsonText(option.type, sizeof(option.type), entry["type"], "tts");
    if (option.type[0] == '\0') {
      setText(option.type, sizeof(option.type), "tts");
    }
    copyJsonText(option.src, sizeof(option.src), entry["src"], "");
    copyJsonText(option.background, sizeof(option.background), entry["background"], "#000000");
    if (option.background[0] == '\0') {
      setText(option.background, sizeof(option.background), "#000000");
    }
    copyJsonText(option.color, sizeof(option.color), entry["color"], "#ffff00");
    if (option.color[0] == '\0') {
      setText(option.color, sizeof(option.color), "#ffff00");
    }
    option.pulseOutput = readFlag(entry["pulseOutput"], false);
  }
}

void applyDefaults() {
  configDoc.clear();
  configDoc["scanMode"] = "auto";
  configDoc["scanDelayMs"] = kDefaultScanDelayMs;
  configDoc["outputPulseMs"] = kDefaultPulseMs;
  configDoc["volume"] = kDefaultVolume;
  configDoc["ringLevel"] = kDefaultRingLevel;
  JsonArray options = configDoc.createNestedArray("options");
  for (uint8_t i = 0; i < kOptionCount; i++) {
    JsonObject option = options.createNestedObject();
    option["label"] = kDefaultLabels[i];
    option["phrase"] = "";
    option["type"] = "tts";
    option["src"] = "";
    option["background"] = "#000000";
    option["color"] = "#ffff00";
    option["pulseOutput"] = false;
  }
  readSettingsFromDoc();
}

void loadConfig() {
  sdReady = false;
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_SD_CS);
  if (!SD.begin(PIN_SD_CS, SPI)) {
    applyDefaults();
    return;
  }
  sdReady = true;
  File file = SD.open(kConfigPath, FILE_READ);
  if (!file) {
    applyDefaults();
    return;
  }
  const DeserializationError error = deserializeJson(configDoc, file);
  file.close();
  if (error || configDoc.overflowed() || !configDoc.is<JsonObject>()) {
    applyDefaults();
    return;
  }
  readSettingsFromDoc();
}

bool writeConfig() {
  if (!sdReady) {
    return false;
  }
  const char *tempPath = "/config.tmp";
  SD.remove(tempPath);
  File file = SD.open(tempPath, FILE_WRITE);
  if (!file) {
    return false;
  }
  const size_t written = serializeJson(configDoc, file);
  file.flush();
  file.close();
  if (written == 0) {
    SD.remove(tempPath);
    return false;
  }
  SD.remove("/config.bak");
  SD.rename(kConfigPath, "/config.bak");
  if (!SD.rename(tempPath, kConfigPath)) {
    SD.rename("/config.bak", kConfigPath);
    SD.remove(tempPath);
    return false;
  }
  SD.remove("/config.bak");
  return true;
}

bool looksLikeColor(const char *text) {
  if (text == nullptr || text[0] != '#' || strlen(text) != 7) {
    return false;
  }
  for (uint8_t i = 1; i < 7; i++) {
    if (hexNibble(text[i]) < 0) {
      return false;
    }
  }
  return true;
}

bool knownChoiceType(const char *type) {
  return type != nullptr && (strcmp(type, "image") == 0 || strcmp(type, "video") == 0 ||
                             strcmp(type, "game") == 0 || strcmp(type, "tts") == 0);
}

bool acceptablePath(const char *text) {
  if (text == nullptr || text[0] == '\0') {
    return true;
  }
  if (text[0] != '/') {
    return false;
  }
  if (strstr(text, "..") != nullptr) {
    return false;
  }
  const size_t length = strlen(text);
  if (length > 63) {
    return false;
  }
  for (size_t i = 0; i < length; i++) {
    const unsigned char c = static_cast<unsigned char>(text[i]);
    if (c < 0x20 || c == '\\' || c == ' ') {
      return false;
    }
  }
  return true;
}

long clampRange(long value, long minValue, long maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

void clampText(JsonObject object, const char *key, size_t maxChars, const char *fallback) {
  char buf[96];
  const char *text = fallback == nullptr ? "" : fallback;
  const JsonVariant value = object[key];
  if (value.is<const char *>()) {
    const char *parsed = value.as<const char *>();
    if (parsed != nullptr) {
      text = parsed;
    }
  }
  size_t n = 0;
  while (text[n] != '\0' && n < maxChars && n + 1 < sizeof(buf)) {
    buf[n] = text[n];
    n++;
  }
  buf[n] = '\0';
  object[key] = buf;
}

void clampColor(JsonObject object, const char *key, const char *fallback) {
  const char *text = nullptr;
  if (object[key].is<const char *>()) {
    text = object[key].as<const char *>();
  }
  if (!looksLikeColor(text)) {
    text = fallback;
  }
  char buf[8];
  for (uint8_t i = 0; i < 7; i++) {
    char c = text[i];
    if (c >= 'A' && c <= 'F') {
      c = static_cast<char>(c - 'A' + 'a');
    }
    buf[i] = c;
  }
  buf[7] = '\0';
  object[key] = buf;
}

bool normalizeConfigDoc() {
  bool step = false;
  if (configDoc["scanMode"].is<const char *>()) {
    const char *mode = configDoc["scanMode"].as<const char *>();
    step = mode != nullptr && strcmp(mode, "step") == 0;
  }
  configDoc["scanMode"] = step ? "step" : "auto";

  long delayMs = configDoc["scanDelayMs"] | static_cast<long>(kDefaultScanDelayMs);
  if (delayMs == 0) {
    delayMs = static_cast<long>(kDefaultScanDelayMs);
  }
  configDoc["scanDelayMs"] = clampRange(delayMs, 500, 120000);

  long pulseMs = configDoc["outputPulseMs"] | static_cast<long>(kDefaultPulseMs);
  if (pulseMs < 0) {
    pulseMs = static_cast<long>(kDefaultPulseMs);
  }
  configDoc["outputPulseMs"] = clampRange(pulseMs, 100, 30000);

  configDoc["volume"] = static_cast<int>(clampRange(configDoc["volume"] | static_cast<long>(kDefaultVolume), 0, 9));
  configDoc["ringLevel"] =
      static_cast<int>(clampRange(configDoc["ringLevel"] | static_cast<long>(kDefaultRingLevel), 0, 9));

  JsonArray options = configDoc["options"].as<JsonArray>();
  for (uint8_t i = 0; i < kOptionCount; i++) {
    if (!options[i].is<JsonObject>()) {
      options[i].to<JsonObject>();
    }
    JsonObject object = options[i].as<JsonObject>();
    clampText(object, "label", 47, kDefaultLabels[i]);
    const char *label = object["label"].as<const char *>();
    if (label == nullptr || label[0] == '\0') {
      object["label"] = kDefaultLabels[i];
    }
    clampText(object, "phrase", 95, "");
    char typeBuf[12];
    const char *typeText = "tts";
    if (object["type"].is<const char *>()) {
      const char *parsed = object["type"].as<const char *>();
      if (knownChoiceType(parsed)) {
        typeText = parsed;
      }
    }
    setText(typeBuf, sizeof(typeBuf), typeText);
    object["type"] = typeBuf;
    char pathBuf[64];
    pathBuf[0] = '\0';
    if (object["src"].is<const char *>()) {
      const char *parsed = object["src"].as<const char *>();
      if (parsed != nullptr && acceptablePath(parsed)) {
        setText(pathBuf, sizeof(pathBuf), parsed);
      }
    }
    object["src"] = pathBuf;
    clampColor(object, "background", "#000000");
    clampColor(object, "color", "#ffff00");
    object["pulseOutput"] = readFlag(object["pulseOutput"], false);
    if (configDoc.overflowed()) {
      return false;
    }
  }
  return !configDoc.overflowed();
}

void changeVolume(int8_t delta) {
  int16_t next = static_cast<int16_t>(settings.volume) + delta;
  if (next < 0) {
    next = 0;
  }
  if (next > 9) {
    next = 9;
  }
  if (next == settings.volume) {
    return;
  }
  settings.volume = static_cast<uint8_t>(next);
  if (speechReady) {
    ss.setVolume(settings.volume);
  }
  broadcastVolume(settings.volume);
  configDoc["volume"] = settings.volume;
  if (!configDoc.overflowed()) {
    writeConfig();
  }
}

void serviceAutoScan() {
  if (!autoScanEnabled()) {
    scanTimerArmed = false;
    return;
  }
  if (!scanTimerArmed) {
    armScanTimer();
    return;
  }
  if (static_cast<int32_t>(millis() - scanDueMs) < 0) {
    return;
  }
  advanceFocus();
}

void handleInputs() {
  bool pressed[kInputCount];
  for (uint8_t i = 0; i < kInputCount; i++) {
    pressed[i] = pressedEdge(i);
  }

  if (pressed[kInputVolumeUp]) {
    changeVolume(1);
  }
  if (pressed[kInputVolumeDown]) {
    changeVolume(-1);
  }
  if (pressed[kInputDevice]) {
    broadcastInteract(focusIndex);
    speakPort(focusIndex, settings.options[focusIndex].label);
  }

  for (uint8_t i = 0; i < kOptionCount; i++) {
    if (pressed[i]) {
      selectOption(i);
    }
  }

  if (pressed[kInputScan]) {
    if (autoScanEnabled()) {
      selectOption(focusIndex);
    } else {
      advanceFocus();
    }
  }
}

}  // namespace

bool storeConfigJson(const char *json, size_t length) {
  if (!sdReady || json == nullptr || length == 0 || length >= kConfigCapacity) {
    return false;
  }
  static char backup[kConfigCapacity];
  const size_t backupLen = serializeJson(configDoc, backup, sizeof(backup));
  if (backupLen == 0 || backupLen >= sizeof(backup) - 1) {
    return false;
  }

  auto restore = [&]() {
    const DeserializationError restored = deserializeJson(configDoc, backup, backupLen);
    if (restored || configDoc.overflowed() || !configDoc.is<JsonObject>()) {
      applyDefaults();
    }
  };

  const DeserializationError error = deserializeJson(configDoc, json, length);
  if (error || configDoc.overflowed() || !configDoc.is<JsonObject>() || !configDoc["options"].is<JsonArray>() ||
      configDoc["options"].size() != kOptionCount) {
    restore();
    return false;
  }
  if (!normalizeConfigDoc()) {
    restore();
    return false;
  }
  if (!writeConfig()) {
    restore();
    return false;
  }
  readSettingsFromDoc();
  if (speechReady) {
    ss.setVolume(settings.volume);
  }
  driveRings();
  if (autoScanEnabled()) {
    armScanTimer();
  } else {
    scanTimerArmed = false;
  }
  broadcastConfig();
  return true;
}

void deviceBegin() {
  holdRelaysOff();
  beginRelayOffTimers();
  focusIndex = 0;
  beginInputs();
  loadConfig();
  beginRings();
  beginSpeech();
  if (autoScanEnabled()) {
    armScanTimer();
  } else {
    scanTimerArmed = false;
  }
  speakPort(focusIndex, settings.options[focusIndex].label);
}

void deviceLoop() {
  serviceRelay();
  handleInputs();
  serviceAutoScan();
  serviceRelay();
}
