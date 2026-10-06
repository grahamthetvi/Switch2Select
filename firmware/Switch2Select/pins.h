/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * This program is free software under GPL-3.0-or-later.
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire, but this file is not derived from that firmware.
 * The DFRobot Speech Synthesis V2 library, if used, is MIT licensed. Copyright (c) DFRobot Co.Ltd.
 */

#ifndef SWITCH2SELECT_PINS_H
#define SWITCH2SELECT_PINS_H

#include <stdint.h>

// GPIO 0, 2, and 12 are strapping pins and are intentionally unused.

// VSPI defaults. Chip select is GPIO 5.
constexpr uint8_t PIN_SD_CS = 5;
constexpr uint8_t PIN_SPI_MOSI = 23;
constexpr uint8_t PIN_SPI_MISO = 19;
constexpr uint8_t PIN_SPI_SCK = 18;

// Active-low option buttons. Input-only pins; external 10k pull-ups, no internal pull-up.
constexpr uint8_t PIN_OPTION_0 = 34;
constexpr uint8_t PIN_OPTION_1 = 35;
constexpr uint8_t PIN_OPTION_2 = 36;
constexpr uint8_t PIN_OPTION_3 = 39;

// Active-low, internal pull-up.
constexpr uint8_t PIN_SCAN = 32;
constexpr uint8_t PIN_VOLUME_UP = 27;
constexpr uint8_t PIN_VOLUME_DOWN = 33;
constexpr uint8_t PIN_DEVICE = 14;

// Data for four 7-LED WS2812B rings behind the flash cards.
// GPIO 25 and 26 are unused. The student wall has no LED holes.
constexpr uint8_t PIN_RING_DATA = 13;

// Active-low relay modules. HIGH keeps the coil off.
constexpr uint8_t PIN_RELAY_0 = 4;
constexpr uint8_t PIN_RELAY_1 = 15;
constexpr uint8_t PIN_RELAY_2 = 21;
constexpr uint8_t PIN_RELAY_3 = 22;

// UART2 to the DFRobot Gravity Speech Synthesis V2 module.
// RX receives module D/T. TX drives module C/T.
constexpr uint8_t PIN_SPEECH_RX = 16;
constexpr uint8_t PIN_SPEECH_TX = 17;

#endif
