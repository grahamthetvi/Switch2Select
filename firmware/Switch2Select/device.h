/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * This program is free software under GPL-3.0-or-later.
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire, but this file is not derived from that firmware.
 * The DFRobot Speech Synthesis V2 library, if used, is MIT licensed. Copyright (c) DFRobot Co.Ltd.
 */

#ifndef SWITCH2SELECT_DEVICE_H
#define SWITCH2SELECT_DEVICE_H

#include <Arduino.h>

struct Option {
  char label[48];
  char phrase[96];
  char type[12];
  char src[64];
  char background[8];
  char color[8];
  bool pulseOutput;
};

struct Settings {
  char scanMode[8];
  uint32_t scanDelayMs;
  uint32_t outputPulseMs;
  uint8_t volume;
  // 0..9. 0 leaves the card rings dark. The sample card uses 4.
  uint8_t ringLevel;
  Option options[4];
};

// Runtime copy of /config.json. Safe defaults apply when the card or file is missing.
extern Settings settings;

// Highlighted option, 0..3. Speech names that port. The matching card ring is the only one lit.
extern uint8_t focusIndex;

void deviceBegin();
void deviceLoop();

// The open student page asks auto scan to wait (hold) or lends the five student
// switches to a game (play). Resume returns to the four choices. A dropped page
// does the same as resume.
void browserHold(uint8_t clientNum);
void browserPlay(uint8_t clientNum);
void browserResume(uint8_t clientNum);
void browserClientLeft(uint8_t clientNum);

// Replace /config.json from the setup page and apply it while the device stays on.
// Returns false when the card is missing or the JSON is not four choices.
bool storeConfigJson(const char *json, size_t length);

#endif
