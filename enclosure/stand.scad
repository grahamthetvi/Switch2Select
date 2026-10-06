// Switch2Select tablet and card stand
// Copyright (C) 2026 Switch2Select contributors
// SPDX-License-Identifier: CERN-OHL-W-2.0
//
// The stand sits on the lid. A rail at 18 degrees from vertical holds either
// an iPad or a four-card panel. Side pieces extend the rail past the box.
// Card rings sit in a pocket behind each card; the harness drops through the
// lid port cut by switch2select.scad.
//
// Landscape widths (long edge on the ledge), thickness last:
//   iPad mini 6/7                  195.4 x 134.8 x 6.3
//   iPad 9.7 (5th/6th, Pro 9.7)    240.0 x 169.5 x 6.1 to 7.5
//   iPad 7th/8th/9th (10.2)        250.6 x 174.1 x 7.5
//   iPad 10th / A16 (10.9)         248.6 x 179.5 x 7.0
//   iPad Air 11, Pro 11 (2018-22)  247.6 x 178.5 x 5.9 to 6.1
//   iPad Pro 11 M4                 249.7 x 177.5 x 5.3
//   iPad Air 13, Pro 12.9          280.6 x 214.9 x 5.9 to 6.4
//   iPad Pro 13 M4                 281.6 x 215.5 x 5.1
// Portrait works too: the rails slide. Ticks mark landscape widths.
// The channel is deeper than the thickest bare iPad (7.5 mm). A case has to
// stay under 11 mm thick.

part = "assembly"; // [assembly, cap, plate, extension-left, extension-right, rail, cards-left, cards-right, foot]

// Lid top is z = 0 for every part. The box is below that.
box_x = 200;
box_y = 140;
box_z = 55;
cap_t = 3.6;

tilt = 18;
plate_rot = 90 - tilt;
plate_t = 4;
plate_w = 200;
plate_h = 176;
foot_t = 8;
foot_y0 = 88;
foot_y1 = 152;
hinge_y = 118;
ext_w = 120;
lap_x = 18;
lap_t = 3;
part_gap = 0.35;

// Same centers as switch2select.scad.
stand_bolt_y = 94;
stand_bolt_xs = [28, 64, 136, 172];
m3_clear = 3.4;
m3_pilot = 2.8;
ring_port_x = 114;
ring_port_y = 96;
ring_port_w = 12;
ring_port_h = 10;

channel_d = 12;
floor_y = 12;
stop_rise = 12;
stop_z0 = channel_d;
stop_z1 = channel_d + 6;
rib_h = 6;
rib_y0 = floor_y + stop_rise;
rib_y1 = rib_y0 + rib_h;
rail_clear = 0.45;
rail_wall = 2.6;

// 3 x 5 inch card, portrait, with room to slide a laminated card in.
card_w = 76.2;
card_h = 127;
slot_w = card_w + 1.6;
slot_h = card_h + 8;
bite = 3.2;
side_wall = 6;
divider_w = 5;
join_w = 16;
bottom_rail = 6;
panel_h = bottom_rail + slot_h + 9;
groove_z0 = 1.0;
groove_z1 = 2.8;
pocket_z0 = 4.2;
panel_z = 6.6;
seat_d = 23.8;
hole_d = 10;
label_font = "Liberation Sans:style=Bold";

function half_w() = side_wall + 2 * slot_w + divider_w + join_w;
function card_panel_w() = 2 * half_w() - join_w;
function ledge_x0() = -ext_w;
function ledge_x1() = plate_w + ext_w;

module plate_place() {
  translate([0, hinge_y, foot_t])
    rotate([plate_rot, 0, 0])
      children();
}

module m3_hole(h) {
  cylinder(h = h, d = m3_clear, $fn = 32);
}

module pilot_hole(h) {
  cylinder(h = h, d = m3_pilot, $fn = 28);
}

module cable_port_cut() {
  translate([
    ring_port_x - ring_port_w / 2,
    ring_port_y - ring_port_h / 2,
    -2
  ])
    cube([ring_port_w, ring_port_h, foot_t + cap_t + 6]);
}

module stand_cap() {
  difference() {
    union() {
      cube([box_x, box_y, cap_t]);
      translate([0, box_y, 0])
        cube([16, 36, cap_t]);
      translate([box_x - 16, box_y, 0])
        cube([16, 36, cap_t]);
      translate([6, 4, cap_t - 0.4])
        linear_extrude(1.1)
          text("FRONT", size = 5, font = label_font, halign = "left");
    }
    translate([68, 46, -1])
      cube([64, 40, cap_t + 2]);
    cable_port_cut();
    for (x = stand_bolt_xs)
      translate([x, stand_bolt_y, -1])
        m3_hole(cap_t + 2);
    translate([8, 158, -1])
      m3_hole(cap_t + 2);
    translate([box_x - 8, 158, -1])
      m3_hole(cap_t + 2);
  }
}

module slope_plate(x0, x1) {
  translate([x0, -4, -plate_t])
    cube([x1 - x0, plate_h + 4, plate_t]);
}

module slope_ledge(x0, x1) {
  translate([x0, 0, 0])
    cube([x1 - x0, floor_y, channel_d]);
  translate([x0, 0, stop_z0])
    cube([x1 - x0, rib_y0, stop_z1 - stop_z0]);
  translate([x0, rib_y0, stop_z0])
    cube([x1 - x0, rib_h, stop_z1 - stop_z0]);
}

module width_ticks(x0, x1) {
  ticks = [
    [97.7, "mini"],
    [125.3, "10"],
    [140.8, "13"],
    [card_panel_w() / 2, "card"]
  ];
  for (tick = ticks) {
    for (s = [-1, 1]) {
      x = 100 + s * tick[0];
      if (x > x0 + 8 && x < x1 - 8)
        translate([x, floor_y + 4, stop_z1 - 0.2])
          linear_extrude(0.8)
            text(tick[1], size = 3.4, font = label_font, halign = "center", valign = "center");
    }
  }
}

module cable_notch_local() {
  translate([ring_port_x - ring_port_w / 2, -1, -plate_t - 1])
    cube([ring_port_w, floor_y + 6, plate_t + channel_d + 2]);
  translate([ring_port_x - ring_port_w / 2, 8, -plate_t - 0.2])
    cube([ring_port_w, 90, 2.6]);
}

module foot_solid(x0, x1) {
  translate([x0, foot_y0, 0])
    cube([x1 - x0, foot_y1 - foot_y0, foot_t]);
}

module center_plate() {
  difference() {
    union() {
      foot_solid(0, plate_w);
      plate_place() {
        slope_plate(0, plate_w);
        slope_ledge(0, plate_w);
        width_ticks(0, plate_w);
      }
    }
    translate([-0.2, foot_y0 - 0.2, foot_t - lap_t])
      cube([lap_x + 0.2, foot_y1 - foot_y0 + 0.4, lap_t + 1]);
    translate([plate_w - lap_x, foot_y0 - 0.2, foot_t - lap_t])
      cube([lap_x + 0.2, foot_y1 - foot_y0 + 0.4, lap_t + 1]);
    for (x = stand_bolt_xs)
      translate([x, stand_bolt_y, -1])
        m3_hole(foot_t + 2);
    cable_port_cut();
    translate([
      ring_port_x - ring_port_w / 2,
      ring_port_y - 1,
      foot_t - 4
    ])
      cube([ring_port_w, hinge_y - ring_port_y + 8, 5]);
    plate_place()
      cable_notch_local();
    for (y = [100, 112]) {
      translate([10, y, foot_t - lap_t - 4.2])
        pilot_hole(4.4);
      translate([plate_w - 10, y, foot_t - lap_t - 4.2])
        pilot_hole(4.4);
    }
  }
}

module extension_left() {
  difference() {
    union() {
      foot_solid(-ext_w, -part_gap);
      translate([-part_gap, foot_y0, foot_t - lap_t])
        cube([lap_x + part_gap, foot_y1 - foot_y0, lap_t]);
      plate_place() {
        slope_plate(-ext_w, -part_gap);
        slope_ledge(-ext_w, -part_gap);
        width_ticks(-ext_w, -part_gap);
      }
    }
    for (y = [100, 112])
      translate([10, y, foot_t - lap_t - 1])
        m3_hole(lap_t + 2);
  }
}

module extension_right() {
  translate([100, 0, 0])
    mirror([1, 0, 0])
      translate([-100, 0, 0])
        extension_left();
}

module rail_local() {
  solid_y0 = rib_y0 - rail_clear;
  solid_y1 = rib_y1 + rail_wall + rail_clear;
  z0 = stop_z0 - rail_wall;
  z1 = stop_z1 + rail_wall;
  difference() {
    union() {
      translate([-16, solid_y0, z0])
        cube([32, solid_y1 - solid_y0, z1 - z0]);
      translate([10, floor_y, 1.2])
        cube([rail_wall, rib_y0 - floor_y + rail_wall, channel_d - 1.2]);
    }
    translate([-20, solid_y0 - 1, stop_z0 - rail_clear])
      cube([40, rib_h + 2 * rail_clear + 1, (stop_z1 - stop_z0) + 2 * rail_clear]);
    translate([0, rib_y1 - 0.2, (stop_z0 + stop_z1) / 2])
      rotate([-90, 0, 0])
        pilot_hole(rail_wall + 2);
  }
}

module rail_print() {
  translate([32, 20, -1.54])
    rotate([-90, 0, 0])
      translate([-16, -rib_y1 - rail_wall - 2, -stop_z1 - rail_wall])
        rail_local();
}

module nut_recess(d, h) {
  cylinder(h = h, d = d / cos(30), $fn = 6);
}

function slot_x0(i, join_on_right) =
  (join_on_right ? side_wall : join_w) + i * (slot_w + divider_w);

module card_window(x, y, z, w, h, t) {
  translate([x, y, z])
    cube([w, h, t]);
}

module cards_half(join_on_right) {
  hw = half_w();
  difference() {
    union() {
      cube([hw, panel_h, panel_z]);
      for (i = [0, 1]) {
        cx = slot_x0(i, join_on_right) + slot_w / 2;
        translate([cx, panel_h - 0.2, panel_z / 2])
          rotate([-90, 0, 0])
            linear_extrude(0.8)
              text(
                str(join_on_right ? i + 1 : i + 3),
                size = 5,
                font = label_font,
                halign = "center",
                valign = "center"
              );
      }
      if (join_on_right)
        for (y = [36, 96])
          translate([hw - join_w, y - 8, panel_z - 0.2])
            cube([join_w, 16, 3.2]);
    }
    for (i = [0, 1]) {
      x0 = slot_x0(i, join_on_right);
      card_window(
        x0 + bite,
        bottom_rail,
        -1,
        slot_w - 2 * bite,
        slot_h + 8,
        groove_z0 + 1
      );
      card_window(
        x0,
        bottom_rail,
        groove_z0,
        slot_w,
        slot_h,
        groove_z1 - groove_z0
      );
      translate([x0 + slot_w / 2, bottom_rail + card_h / 2, pocket_z0])
        cylinder(h = panel_z - pocket_z0 + 1, d = seat_d, $fn = 64);
      translate([x0 + slot_w / 2, bottom_rail + card_h / 2, -1])
        cylinder(h = pocket_z0 + 2, d = hole_d, $fn = 48);
      translate([x0 + slot_w / 2 - 18, bottom_rail + card_h / 2, -1])
        cylinder(h = panel_z + 2, d = 2.6, $fn = 20);
      translate([x0 + slot_w / 2 + 18, bottom_rail + card_h / 2, -1])
        cylinder(h = panel_z + 2, d = 2.6, $fn = 20);
      translate([x0 + slot_w / 2 - 3, 16, panel_z - 2.5])
        cube([6, bottom_rail + card_h / 2 - 10, 3]);
    }
    translate([-0.2, 16, panel_z - 2.3])
      cube([hw + 0.4, 6, 2.6]);
    if (join_on_right) {
      translate([hw - join_w - 0.1, -1, -1])
        cube([join_w + 1.1, panel_h + 2, panel_z - 3.2]);
      for (y = [36, 96]) {
        translate([hw - join_w / 2, y, panel_z + 0.2])
          nut_recess(5.8, 2.8);
        translate([hw - join_w / 2, y, -1])
          m3_hole(panel_z + 5);
      }
    } else {
      translate([-0.1, -1, 3.2])
        cube([join_w + 0.1, panel_h + 2, panel_z]);
      for (y = [36, 96])
        translate([join_w / 2, y, -1])
          m3_hole(panel_z + 2);
    }
  }
}

module foot_use(side) {
  x0 = side < 0 ? 2 : box_x - 14;
  difference() {
    union() {
      translate([x0, 146, cap_t])
        cube([12, 30, 4]);
      translate([x0, 168, -box_z])
        cube([12, 8, box_z + cap_t]);
    }
    translate([x0 + 6, 158, cap_t - 1])
      m3_hole(6);
  }
}

// Laid on its side: the 12 mm width is the print height, so the screw hole
// is vertical and the leg does not cantilever.
module foot_print() {
  translate([55, -146, 14])
    rotate([0, 90, 0])
      foot_use(-1);
}

module ipad_ghost() {
  w = 250.6;
  h = 174.1;
  t = 7.5;
  plate_place()
    translate([100 - w / 2, floor_y + 0.8, 0.4])
      cube([w, h, t]);
}

module cards_ghost() {
  origin = 100 - card_panel_w() / 2;
  plate_place()
    translate([origin, floor_y + 0.4, 0.3])
      rotate([180, 0, 0])
        translate([0, -panel_h, -panel_z])
          union() {
            cards_half(true);
            translate([half_w() - join_w, 0, 0])
              cards_half(false);
          };
}

module assembly() {
  color("silver")
    stand_cap();
  color("ivory")
    translate([0, 0, cap_t])
      union() {
        center_plate();
        extension_left();
        extension_right();
      }
  color("tan") {
    translate([0, 0, cap_t])
      plate_place()
        translate([-30, 0, 0])
          rail_local();
    translate([0, 0, cap_t])
      plate_place()
        translate([230, 0, 0])
          mirror([1, 0, 0])
            rail_local();
  }
  color("slategray") {
    foot_use(-1);
    foot_use(1);
  }
  color([0.2, 0.45, 0.75, 0.35])
    translate([0, 0, cap_t])
      ipad_ghost();
  color([0.85, 0.75, 0.2, 0.45])
    translate([0, 0, cap_t])
      cards_ghost();
  color([0.15, 0.15, 0.15, 0.25])
    translate([0, 0, -box_z])
      cube([box_x, box_y, box_z]);
}

assert(tilt >= 12 && tilt <= 22, "tilt must stay a slight lean");
assert(channel_d >= 7.5 + 3, "channel must clear a 7th-gen iPad");
assert(channel_d <= 14, "channel should still catch a thin iPad");
assert(plate_h >= 174.1, "plate must cover a 10.2 inch iPad");
assert(seat_d >= 23.4 && seat_d <= 24.2, "ring seat must fit a 23 mm ring");
assert(hole_d + 6 < seat_d, "ring seat must keep a lip around the light hole");
assert(slot_w >= card_w + 0.8, "card slot must clear a 3 x 5 card");
assert(slot_h >= card_h, "card slot must accept the card height");
assert(card_panel_w() + 40 < ledge_x1() - ledge_x0(), "ledge must hold the card panel and both rails");
assert(281.6 + 40 < ledge_x1() - ledge_x0(), "ledge must hold a 13 inch iPad and both rails");
assert(foot_y0 <= stand_bolt_y - 4, "foot must surround the stand bolts");
assert(hinge_y > stand_bolt_y + 16, "hinge must stay behind the stand bolts");
assert(panel_z < channel_d, "card panel must sit in the device channel");
assert(half_w() < 220, "a card half must fit a 220 mm bed");

echo(card_panel_w = card_panel_w());
echo(ledge_span = ledge_x1() - ledge_x0());
echo(half_w = half_w());
echo(panel_h = panel_h);
echo(channel_d = channel_d);
echo(tilt = tilt);

if (part == "assembly")
  assembly();
else if (part == "cap")
  stand_cap();
else if (part == "plate")
  translate([0, -foot_y0, 0])
    center_plate();
else if (part == "extension-left")
  translate([ext_w, -foot_y0, 0])
    extension_left();
else if (part == "extension-right")
  translate([-(plate_w - lap_x), -foot_y0, 0])
    extension_right();
else if (part == "rail")
  rail_print();
else if (part == "cards-left")
  cards_half(true);
else if (part == "cards-right")
  cards_half(false);
else if (part == "foot")
  foot_print();

assert(
  part == "assembly" || part == "cap" || part == "plate"
    || part == "extension-left" || part == "extension-right"
    || part == "rail" || part == "cards-left" || part == "cards-right"
    || part == "foot",
  "unknown part"
);
