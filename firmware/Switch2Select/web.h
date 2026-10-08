/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire.
 * This file is original, not copied from that firmware.
 */

#pragma once

#include <stdint.h>

bool anyWebSocketClient();
void broadcastFocus(uint8_t index);
void broadcastSelect(uint8_t index);
void broadcastSwitch(uint8_t index);
void broadcastScan();
void broadcastVolume(uint8_t level);
void broadcastInteract(uint8_t index);
void broadcastConfig();
void webBegin();
void webLoop();
