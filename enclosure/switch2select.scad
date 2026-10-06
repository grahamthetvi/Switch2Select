// Switch2Select enclosure
// Copyright (C) 2026 Switch2Select contributors
// SPDX-License-Identifier: CERN-OHL-W-2.0
// Original hardware design. Inspired by Chatterbox, Copyright (c) 2025 Neil Squire.
// https://github.com/makersmakingchange/Chatterbox

// "bottom", "lid", or "both" (bottom and lid side by side).
part = "both"; // [bottom, lid, both]

// Assembled outside size. The lid skin sits on the bottom rim.
outer_x = 200;
// Opposing cradles, cord exits, and wrap stems clear at this depth, with
// room between them for the ESP32, relay module, and speech module.
outer_y = 140;
outer_z = 55;
wall = 2.4;
// Outside vertical corners. Flat faces keep the full outside size.
corner_r = 6;

floor_t = wall;
lid_t = wall;
bottom_z = outer_z - lid_t;

// Lid lip drops inside the bottom opening.
fit_gap = 0.4;
lip_t = 2;
lip_h = 4;
layout_gap = 20;

// Corner bosses in the bottom; M3 clearance holes in the lid.
m3_clear = 3.4;
m3_tap = 2.8;
boss_od = 12;
boss_inset = 8;
pilot_depth = 10;
boss_top_gap = 0.15;

// 3.5 mm jacks push in through a 9.1 mm hole. The cradle is a hair larger
// and as deep as the jack cylinder. A shoulder stops the cylinder. The
// cord leaves through that shoulder. A round cord binds in a hole of its
// own width, so the passage is 0.4 mm larger and no more.
jack_d = 9.1;
jack_cradle_clear = 0.4;
jack_body_len = 27.3;
jack_cradle_wall = 2.4;
jack_stop_t = 4;
cradle_bite = 0.2;
cord_diameter = 6.6;
cord_clear = 0.4;
// Volume buttons are 11.8 mm wide. 0.2 mm clearance (under 0.3) lets them push in.
button_w = 11.8;
button_clearance = 0.2;
button_d = button_w + button_clearance;
button_back = 9;
button_back_gap = 7.55;
button_back_t = 2.4;

// Rocker: 20 mm hole. Body behind the panel is 20.5 mm across and 25.4 mm
// deep, including the two terminals. Snap wings need a wider empty pocket.
rocker_d = 20;
rocker_body_d = 20.5;
rocker_depth = 25.4;
rocker_clear_d = rocker_body_d + 7.5;

usb_w = 12;
usb_h = 8;
sd_w = 16;
sd_h = 3;

option_count = 4;
jack_margin = 40;
input_z = 28;
scan_z = 16;
toy_z = 40;
control_z = 16;

// Partner wall, left to right when facing that wall:
// minus, plus, device, rocker, USB, microSD.
minus_x = 170;
plus_x = 140;
device_x = 122;
rocker_x = 100;
usb_x = 64;
sd_x = 32;

// Stand bolts through the lid. enclosure/stand.scad uses these same centers.
stand_bolt_y = 94;
stand_bolt_xs = [28, 64, 136, 172];

// Card-ring harness enters through the lid. stand.scad repeats this opening.
ring_port_x = 114;
ring_port_y = 96;
ring_port_w = 12;
ring_port_h = 10;

// Cord stem, inboard of each jack, fused to the floor.
stem_d = 5;
stem_head_d = 7.4;
stem_flare_h = 1.6;
stem_dx = 14;
stem_side_gap = 1.5;
stem_above = 2;

raise_h = 0.8;
raise_sink = 0.2;
numeral_size = 6;
numeral_dx = 12;
mark_gap = 2.2;
mark_stroke = 1.6;
label_font = "Liberation Sans:style=Bold";

// Grade 1 braille. Dot shape, diameter, and spacing match braille-label.
// Dot height is the proud height (ADA signage maximum).
braille_dot_d = 1.6;
braille_dot_h = 0.9;
braille_dot_spacing = 2.5;
braille_cell_spacing = 6.5;
braille_gap = 2;
braille_embed = 0.04;
braille_fn = 32;

grill_x = 42;
grill_y = 32;
grill_slot_w = 3;
grill_slot_n = 7;

button_mark_z = control_z + button_d / 2 + mark_gap + numeral_size / 2;
grill_slot_rib = (grill_y - grill_slot_n * grill_slot_w) / (grill_slot_n - 1);
lip_notch = boss_inset + boss_od / 2 + 1.5 - wall - fit_gap;
raise_total = raise_h + raise_sink;

jack_id = jack_d + jack_cradle_clear;
jack_outer_w = jack_id + 2 * jack_cradle_wall;
cord_hole_d = cord_diameter + cord_clear;
// Inward face of the student shoulder. The bite overlaps the wall only,
// so the pocket from the inner face is the full jack body.
student_cradle_end = wall + jack_body_len + jack_stop_t;
partner_cradle_end = outer_y - student_cradle_end;
cradle_end_gap = partner_cradle_end - student_cradle_end;
braille_dot_r = braille_dot_d / 2;
braille_cell_h = 2 * braille_dot_spacing + braille_dot_d;

function option_x(i) =
  jack_margin + i * (outer_x - 2 * jack_margin) / (option_count - 1);

function corner_x(i) = (i == 1 || i == 3) ? outer_x - boss_inset : boss_inset;
function corner_y(i) = (i >= 2) ? outer_y - boss_inset : boss_inset;

function dot_offset(d) = [
  d > 3 ? braille_dot_spacing : 0,
  -((d - 1) % 3) * braille_dot_spacing
];

function word_w(n) = (n - 1) * braille_cell_spacing + braille_dot_spacing + braille_dot_d;

// Partner braille reads toward -X. This is the dot-1 center of the first cell
// when the word is centered on center_x.
function partner_word_x(center_x, n) =
  center_x + (word_w(n) - braille_dot_d) / 2;

// Stem axis is past the cord exit and stem_dx off the jack axis, so the
// lead can wrap after it leaves the cylinder without closing the passage.
function student_stem_y() =
  wall + jack_body_len + jack_stop_t + stem_side_gap + stem_d / 2;

function partner_stem_y() = min(
  outer_y - wall - jack_body_len - jack_stop_t - stem_side_gap - stem_d / 2,
  outer_y - rocker_depth - stem_side_gap - stem_d / 2
);

module rounded_prism(size, r) {
  hull() {
    for (x = [r, size[0] - r])
      for (y = [r, size[1] - r])
        translate([x, y, 0])
          cylinder(h = size[2], r = r, $fn = 64);
  }
}

module hole_y(x, z, d, y0, depth) {
  translate([x, y0, z])
    rotate([-90, 0, 0])
      cylinder(h = depth, d = d, $fn = 64);
}

module slot_y(x, z, w, h, y0, depth) {
  translate([x - w / 2, y0, z - h / 2])
    cube([w, depth, h]);
}

module student_cutouts() {
  for (i = [0:option_count - 1])
    hole_y(option_x(i), input_z, jack_d, -1, wall + 2);
  hole_y(outer_x / 2, scan_z, jack_d, -1, wall + 2);
}

module partner_cutouts() {
  y0 = outer_y - wall - 1;
  depth = wall + 2;
  for (i = [0:option_count - 1])
    hole_y(option_x(i), toy_z, jack_d, y0, depth);
  hole_y(minus_x, control_z, button_d, y0, depth);
  hole_y(plus_x, control_z, button_d, y0, depth);
  hole_y(device_x, control_z, button_d, y0, depth);
  hole_y(rocker_x, control_z, rocker_d, y0, depth);
  slot_y(usb_x, control_z, usb_w, usb_h, y0, depth);
  slot_y(sd_x, control_z, sd_w, sd_h, y0, depth);
}

// U cradle opening upward. The back is a shoulder around the cord passage.
// inward is +1 on the student wall and -1 on the partner wall.
module jack_cradle(x, z, y_inner, inward) {
  id = jack_id;
  t = jack_cradle_wall;
  len = jack_body_len;
  y0 = y_inner - inward * cradle_bite;
  y_far = y_inner + inward * len;
  y_a = min(y0, y_far);
  y_b = max(y0, y_far);
  y_stop = y_far + inward * jack_stop_t;
  ys_a = min(y_far, y_stop);
  ys_b = max(y_far, y_stop);
  translate([x - id / 2 - t, y_a, z - id / 2 - t])
    cube([jack_outer_w, y_b - y_a, t]);
  translate([x - id / 2 - t, y_a, z - id / 2])
    cube([t, y_b - y_a, id]);
  translate([x + id / 2, y_a, z - id / 2])
    cube([t, y_b - y_a, id]);
  difference() {
    translate([x - id / 2 - t, ys_a, z - id / 2 - t])
      cube([jack_outer_w, ys_b - ys_a, id + t]);
    translate([x, ys_a - 0.4, z])
      rotate([-90, 0, 0])
        cylinder(h = ys_b - ys_a + 0.8, d = cord_hole_d, $fn = 48);
  }
}

module jack_buttress(x, z, y_inner, inward) {
  len = jack_body_len + jack_stop_t;
  y0 = y_inner - inward * cradle_bite;
  y_far = y_inner + inward * len;
  y_a = min(y0, y_far);
  y_b = max(y0, y_far);
  top = z - jack_id / 2 - jack_cradle_wall + 0.05;
  if (top > 0)
    translate([x - jack_outer_w / 2, y_a, 0])
      cube([jack_outer_w, y_b - y_a, top]);
}

module cord_stem(x, y, z_top) {
  translate([x, y, 0]) {
    cylinder(h = z_top, d = stem_d, $fn = 32);
    translate([0, 0, z_top])
      cylinder(h = stem_flare_h, d1 = stem_d, d2 = stem_head_d, $fn = 32);
  }
}

module rocker_keepout() {
  translate([rocker_x, outer_y - wall - 0.02, control_z])
    rotate([-90, 0, 0])
      cylinder(h = rocker_depth - wall, d = rocker_clear_d, $fn = 64);
}

function input_stem_x(i) = option_x(i) + (i < 2 ? -stem_dx : stem_dx);

module student_jack_hardware() {
  for (i = [0:option_count - 1]) {
    jack_cradle(option_x(i), input_z, wall, 1);
    jack_buttress(option_x(i), input_z, wall, 1);
    cord_stem(input_stem_x(i), student_stem_y(), input_z + stem_above);
  }
  jack_cradle(outer_x / 2, scan_z, wall, 1);
  jack_buttress(outer_x / 2, scan_z, wall, 1);
  cord_stem(outer_x / 2 + stem_dx, student_stem_y(), scan_z + stem_above);
}

// Keep the rocker body, snap wings, button holes, and cable slots clear.
module partner_service_clearance() {
  rocker_keepout();
  y_hit = outer_y - wall - button_back_gap;
  for (bx = [minus_x, plus_x, device_x])
    translate([bx, y_hit - 1, control_z])
      rotate([-90, 0, 0])
        cylinder(h = button_back_gap + wall + 4, d = button_d, $fn = 48);
  // The jack buttress reaches the volume-button backing. Leave that
  // square, its rails, and the gap beside the button untouched.
  rail = 2.4;
  rail_gap = 0.8;
  bar_t = 2.4;
  y_bar = y_hit - button_back_t - bar_t;
  half_w = button_d / 2 + rail_gap + rail + fit_gap;
  plate_top = control_z + button_back / 2;
  for (bx = [minus_x, plus_x, device_x])
    translate([bx - half_w, y_bar - fit_gap, 0])
      cube([2 * half_w, outer_y - y_bar + 1, plate_top + fit_gap]);
  translate([usb_x - (usb_w + 4) / 2, outer_y - wall - 30, control_z - (usb_h + 4) / 2])
    cube([usb_w + 4, 34, usb_h + 4]);
  translate([sd_x - (sd_w + 4) / 2, outer_y - wall - 30, control_z - (sd_h + 6) / 2])
    cube([sd_w + 4, 34, sd_h + 6]);
}

module partner_jack_hardware() {
  difference() {
    union() {
      for (i = [0:option_count - 1]) {
        jack_cradle(option_x(i), toy_z, outer_y - wall, -1);
        jack_buttress(option_x(i), toy_z, outer_y - wall, -1);
        cord_stem(
          option_x(i) + stem_dx,
          partner_stem_y(),
          toy_z + stem_above
        );
      }
    }
    partner_service_clearance();
  }
}

// 9 mm square the button hits, 7.55 mm behind the inner face.
// Rails stay outside the hole and run down to the floor.
module button_backing(x, z) {
  y_inner = outer_y - wall;
  y_hit = y_inner - button_back_gap;
  y_back = y_hit - button_back_t;
  rail = 2.4;
  rail_gap = 0.8;
  bar_t = 2.4;
  y_bar = y_back - bar_t;
  rail_reach = y_inner + 0.2 - y_bar;
  plate_top = z + button_back / 2;
  translate([x - button_back / 2, y_back - 0.05, z - button_back / 2])
    cube([button_back, button_back_t + 0.05, button_back]);
  translate([x - (button_d / 2 + rail_gap + rail), y_bar, z - button_back / 2])
    cube([button_d + 2 * (rail_gap + rail), bar_t, button_back]);
  for (s = [-1, 1])
    translate([
      x + s * (button_d / 2 + rail_gap) - (s < 0 ? rail : 0),
      y_bar,
      0
    ])
      cube([rail, rail_reach, plate_top]);
}

module corner_bosses() {
  for (i = [0:3])
    translate([corner_x(i), corner_y(i), 0])
      cylinder(h = bottom_z - boss_top_gap, d = boss_od, $fn = 64);
}

module corner_pilots() {
  for (i = [0:3])
    translate([
      corner_x(i),
      corner_y(i),
      bottom_z - boss_top_gap - pilot_depth
    ])
      cylinder(h = pilot_depth + 1, d = m3_tap, $fn = 32);
}

module glyph_student(x, z, label, size) {
  translate([x, raise_sink, z])
    rotate([90, 0, 0])
      linear_extrude(height = raise_total)
        text(label, size = size, font = label_font, halign = "center", valign = "center");
}

module glyph_partner(x, z, label, size) {
  translate([x, outer_y + raise_h, z])
    rotate([90, 0, 0])
      mirror([1, 0, 0])
        linear_extrude(height = raise_total)
          text(label, size = size, font = label_font, halign = "center", valign = "center");
}

// Rod plus hemisphere, same construction as braille-label. The total
// length includes a short embed so the dot fuses with the wall; the
// part outside the wall is braille_dot_h.
module braille_dot() {
  eps = 0.01;
  total_h = braille_dot_h + braille_embed;
  cap_r = min(braille_dot_r, total_h);
  stem_h = total_h - cap_r;
  if (stem_h > 0)
    translate([0, 0, -eps])
      cylinder(r = braille_dot_r, h = stem_h + eps, $fn = braille_fn);
  if (cap_r == braille_dot_r)
    translate([0, 0, stem_h])
      intersection() {
        sphere(r = braille_dot_r, $fn = braille_fn);
        translate([-braille_dot_r - eps, -braille_dot_r - eps, -eps])
          cube([
            2 * braille_dot_r + 2 * eps,
            2 * braille_dot_r + 2 * eps,
            braille_dot_r + 2 * eps
          ]);
      }
  else {
    R = (braille_dot_r * braille_dot_r + total_h * total_h) / (2 * total_h);
    intersection() {
      translate([0, 0, total_h - R])
        sphere(r = R, $fn = braille_fn);
      translate([0, 0, -eps])
        cylinder(r = braille_dot_r + eps, h = total_h + eps, $fn = braille_fn);
    }
  }
}

module student_dot(x, z) {
  translate([x, braille_embed, z])
    rotate([90, 0, 0])
      braille_dot();
}

module partner_dot(x, z) {
  translate([x, outer_y - braille_embed, z])
    rotate([-90, 0, 0])
      braille_dot();
}

module student_braille(origin_x, origin_z, cells) {
  for (ci = [0:len(cells) - 1])
    for (d = cells[ci])
      student_dot(
        origin_x + ci * braille_cell_spacing + dot_offset(d)[0],
        origin_z + dot_offset(d)[1]
      );
}

module partner_braille(origin_x, origin_z, cells) {
  for (ci = [0:len(cells) - 1])
    for (d = cells[ci])
      partner_dot(
        origin_x - ci * braille_cell_spacing - dot_offset(d)[0],
        origin_z + dot_offset(d)[1]
      );
}

// Grade 1 numbers: numeric indicator, then a-d for 1-4.
function digit_cells(n) =
  n == 1 ? [[3, 4, 5, 6], [1]] :
  n == 2 ? [[3, 4, 5, 6], [1, 2]] :
  n == 3 ? [[3, 4, 5, 6], [1, 4]] :
  [[3, 4, 5, 6], [1, 4, 5]];

word_scan = [[2, 3, 4], [1, 4], [1], [1, 3, 4, 5]];
word_minus = [[1, 3, 4], [2, 4], [1, 3, 4, 5], [1, 3, 6], [2, 3, 4]];
word_plus = [[1, 2, 3, 4], [1, 2, 3], [1, 3, 6], [2, 3, 4]];
word_use = [[1, 3, 6], [2, 3, 4], [1, 5]];
word_power = [[1, 2, 3, 4], [1, 3, 5], [2, 4, 5, 6], [1, 5], [1, 2, 3, 5]];

module student_marks() {
  for (i = [0:option_count - 1]) {
    glyph_student(option_x(i) - numeral_dx, input_z, str(i + 1), numeral_size);
    student_braille(
      option_x(i) + jack_d / 2 + braille_gap + braille_dot_r,
      input_z + braille_dot_spacing,
      digit_cells(i + 1)
    );
  }
  student_braille(
    outer_x / 2 - word_w(4) / 2 + braille_dot_r,
    scan_z - jack_d / 2 - braille_gap - braille_dot_r,
    word_scan
  );
}

module partner_pad(x, z, w, h) {
  translate([x - w / 2, outer_y - raise_sink, z - h / 2])
    cube([w, raise_total, h]);
}

// Square outline, same stroke as the plus and minus marks.
module device_mark(x, z) {
  s = numeral_size;
  t = mark_stroke;
  partner_pad(x, z + (s - t) / 2, s - 2 * t, t);
  partner_pad(x, z - (s - t) / 2, s - 2 * t, t);
  partner_pad(x - (s - t) / 2, z, t, s);
  partner_pad(x + (s - t) / 2, z, t, s);
}

module partner_marks() {
  for (i = [0:option_count - 1]) {
    glyph_partner(option_x(i) + numeral_dx, toy_z, str(i + 1), numeral_size);
    partner_braille(
      option_x(i) - jack_d / 2 - braille_gap - braille_dot_r,
      toy_z + braille_dot_spacing,
      digit_cells(i + 1)
    );
  }
  partner_pad(minus_x, button_mark_z, numeral_size, mark_stroke);
  partner_pad(plus_x, button_mark_z, numeral_size, mark_stroke);
  partner_pad(plus_x, button_mark_z, mark_stroke, numeral_size);
  device_mark(device_x, button_mark_z);

  low_z = control_z - button_d / 2 - braille_gap - braille_dot_r;
  partner_braille(partner_word_x(178, 5), low_z, word_minus);
  partner_braille(partner_word_x(plus_x, 4), low_z, word_plus);
  partner_braille(partner_word_x(118, 3), low_z, word_use);

  rocker_top = control_z + rocker_d / 2;
  jack_bottom = toy_z - jack_d / 2;
  pad = (jack_bottom - rocker_top - braille_cell_h) / 2;
  power_z = rocker_top + pad + braille_dot_r + 2 * braille_dot_spacing;
  partner_braille(partner_word_x(rocker_x, 5), power_z, word_power);
}

module bottom() {
  difference() {
    union() {
      difference() {
        rounded_prism([outer_x, outer_y, bottom_z], corner_r);
        translate([wall, wall, floor_t])
          rounded_prism([
            outer_x - 2 * wall,
            outer_y - 2 * wall,
            bottom_z - floor_t + 1
          ], corner_r - wall);
        student_cutouts();
        partner_cutouts();
      }
      corner_bosses();
      student_marks();
      partner_marks();
      student_jack_hardware();
      partner_jack_hardware();
      button_backing(minus_x, control_z);
      button_backing(plus_x, control_z);
      button_backing(device_x, control_z);
      ring_tie();
    }
    corner_pilots();
  }
}

// Two posts and a bar on the floor, under the lid cable port.
module ring_tie() {
  span = 16;
  y = 76;
  x0 = ring_port_x - span / 2;
  h = 8;
  for (dx = [0, span])
    translate([x0 + dx, y, floor_t - 0.2])
      cylinder(h = h, d = 4.2, $fn = 24);
  translate([x0, y - 1.5, floor_t + h - 2.6])
    cube([span, 3, 2.6]);
}

module lid_lip() {
  ox = outer_x - 2 * (wall + fit_gap);
  oy = outer_y - 2 * (wall + fit_gap);
  translate([wall + fit_gap, wall + fit_gap, lid_t - 0.2])
    difference() {
      cube([ox, oy, lip_h + 0.2]);
      translate([lip_t, lip_t, -1])
        cube([ox - 2 * lip_t, oy - 2 * lip_t, lip_h + 2]);
      for (px = [0, ox - lip_notch])
        for (py = [0, oy - lip_notch])
          translate([px, py, -1])
            cube([lip_notch, lip_notch, lip_h + 2]);
    }
}

module speaker_grill() {
  pitch = grill_slot_w + grill_slot_rib;
  for (i = [0:grill_slot_n - 1])
    translate([
      -grill_x / 2,
      -grill_y / 2 + i * pitch,
      -1
    ])
      cube([grill_x, grill_slot_w, lid_t + 2]);
}

module lid_screw_holes() {
  for (i = [0:3])
    translate([corner_x(i), corner_y(i), -1])
      cylinder(h = lid_t + lip_h + 2, d = m3_clear, $fn = 48);
}

module lid() {
  difference() {
    union() {
      rounded_prism([outer_x, outer_y, lid_t], corner_r);
      lid_lip();
    }
    lid_screw_holes();
    translate([outer_x / 2, outer_y / 2, 0])
      speaker_grill();
    ring_cable_port();
    stand_bolt_holes();
  }
}

module ring_cable_port() {
  translate([
    ring_port_x - ring_port_w / 2,
    ring_port_y - ring_port_h / 2,
    -1
  ])
    cube([ring_port_w, ring_port_h, lid_t + 2]);
}

module stand_bolt_holes() {
  for (x = stand_bolt_xs)
    translate([x, stand_bolt_y, -1])
      cylinder(h = lid_t + 2, d = m3_clear, $fn = 32);
}

module enclosure() {
  if (part == "bottom")
    bottom();
  else if (part == "lid")
    lid();
  else if (part == "both") {
    bottom();
    translate([outer_x + layout_gap, 0, 0])
      lid();
  }
}

assert(
  part == "bottom" || part == "lid" || part == "both",
  "part must be \"bottom\", \"lid\", or \"both\""
);
assert(button_clearance < 0.3, "button clearance must stay under 0.3 mm");
assert(abs(device_x - plus_x) >= button_d + 4, "device button crowds the plus button");
assert(
  device_x - rocker_x >= (button_d + rocker_d) / 2 + 4,
  "device button crowds the rocker"
);
assert(
  stand_bolt_y + 8 < partner_cradle_end,
  "stand bolt nuts collide with the partner jack cradles"
);
assert(braille_dot_h == 0.9, "braille dot height must be 0.9 mm");
assert(cord_clear <= 0.4, "cord clearance must stay at or under 0.4 mm");
assert(cord_hole_d < jack_d, "cord opening must leave a shoulder on the jack end");
assert(cradle_end_gap > 0, "opposite jack cradles collide");
assert(corner_r - wall >= 2, "inner corner must stay printable");
assert(
  corner_r + 2 < sd_x - sd_w / 2,
  "corner radius must stay clear of the microSD slot"
);
assert(
  partner_word_x(178, 5) + braille_dot_r + 0.5 < outer_x - corner_r,
  "minus braille must stay on the flat partner wall"
);
assert(
  wall + fit_gap + lip_notch > corner_r + (corner_r - wall) / sqrt(2) + 1,
  "lid lip notch must clear the rounded inner corner"
);
assert(
  student_stem_y() - stem_head_d / 2 > wall + jack_body_len,
  "cord stem intersects the jack body"
);
assert(
  partner_stem_y() - stem_head_d / 2 > student_stem_y() + stem_head_d / 2,
  "opposite cord stems collide"
);
echo(cradle_end_gap = cradle_end_gap);
echo(cord_hole_d = cord_hole_d);
echo(stem_gap = partner_stem_y() - student_stem_y() - stem_head_d);

enclosure();
