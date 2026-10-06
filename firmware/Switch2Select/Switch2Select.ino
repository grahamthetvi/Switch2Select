/*
 * Copyright (C) 2026 Switch2Select contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Inspired by Chatterbox, Copyright (c) 2025 Neil Squire.
 * This file is original, not copied from that firmware.
 */

#include "device.h"
#include "web.h"

void setup() {
  deviceBegin();
  webBegin();
}

void loop() {
  deviceLoop();
  webLoop();
}
