// Switch2Select simple iPad stand
// Copyright (C) 2026 Switch2Select contributors
// SPDX-License-Identifier: CERN-OHL-W-2.0
//
// A second stand for the iPad. The full rail, card panel, and rear feet stay
// in enclosure/stand.scad. This one is a cradle and two side stops.
//
// The back leans 8 degrees from vertical. That is enough for a bare iPad to
// rest against the back. The center of a 13 inch iPad (215.5 mm tall,
// 5.1 mm thick) stays about 24 mm in front of the rear edge of the 140 mm
// box, so the cradle alone carries it.
//
// The lip is the low wall on the student side of the shelf. The clear gap
// from that wall back to the sloping back is `channel` (13.5 mm). A bare iPad
// from 5.1 mm to 7.5 mm thick sits on the shelf and leans on the back. The
// lip stops the bottom edge if it slides toward the student. About 2 mm of
// shelf remains behind the lid's cable port, under that bottom edge.
//
// Four M3 holes already in the lid (switch2select.scad) bolt the cradle down.
// Heads sit in counterbores so they stay below the shelf. The ring-cable port
// stays open through the shelf.
//
// Each side stop slides onto the lip from the end. The fin is the outer end
// and faces the iPad. The long body reaches past the box so a 13 inch iPad
// (281.6 mm wide) can be snugged up. An M3×6 screw through the boss presses
// the student face of the lip and keeps the stop from sliding.
//
// The back plate is 6 mm thick. A brace fills in behind it, out to the rear
// edge of the shelf, so the back is solid where it joins the base.
// Outside vertical corners of the cradle are 6 mm. The back's long edges
// and top are 2 mm. The lip the stops grip stays a straight rectangle.
//
// Print the cradle with the base on the bed. The back rises about 8 degrees
// off vertical, and the lip is a vertical wall, so it does not need supports.
// Print each stop as exported: the flat cap is on the bed and the slot faces up.

part = "cradle"; // [cradle, stop, assembly]

tilt = 8;
box_x = 200;
box_y = 140;
box_z = 55;
// Lid skin thickness in switch2select.scad. The cradle screws pass through it.
lid_t = 2.4;

base_t = 6.5;
back_t = 6;
back_len = 160;
base_y1 = 120;
// Outside vertical corners. The shelf top and the bolt face stay flat.
corner_r = 6;
// Long edges and the top of the back. The face the iPad leans on stays flat.
edge_r = 2;
// Outside corners of a side stop. The slot that grips the lip stays square.
stop_r = 1;

// Speaker grill is centered at y = 70 and is 32 mm front to back, so the
// partner edge of the grill is y = 86. The lip stays behind that edge.
grill_y1 = 86;
grill_x0 = 79;
grill_x1 = 121;
lip_y0 = 87.3;
lip_t = 2.4;
lip_h = 8;
channel = 13.5;

// Same centers as switch2select.scad and stand.scad.
stand_bolt_y = 94;
stand_bolt_xs = [28, 64, 136, 172];
m3_clear = 3.4;
m3_pilot = 2.8;
// Socket-head and pan-head M3 screws are about 5.5 mm to 5.6 mm across.
cbore_d = 6.2;
cbore_h = 3.2;
cradle_screw = 10;

ring_port_x = 114;
ring_port_y = 96;
ring_port_w = 12;
ring_port_h = 10;

// Side stop. The fin is the outboard end. The screw boss is near the inboard end.
stop_len = 74;
fin_t = 3.2;
fin_depth = 9;
top_t = 4;
bead = 1.8;
bead_h = 3.2;
clear_y = 0.4;
clear_z = 0.35;
boss_t = 5;
boss_extra = 6;
stop_screw = 6;
screw_x = 62;
gap = 0.8;

lip_y1 = lip_y0 + lip_t;
y_back = lip_y1 + channel;
lip_top = base_t + lip_h;
y_lip_partner = 12;
y_lip_student = y_lip_partner + lip_t;

function com_y(h, t) = y_back + (h / 2) * sin(tilt) - (t / 2) * cos(tilt);
function top_y(h) = y_back + h * sin(tilt);
function back_print_z() = base_t + back_len * cos(tilt);
// Where the partner face of the back meets the top of the shelf.
function back_root_y() = y_back + back_t * cos(tilt);
// How far up the slope that face stays over the shelf.
function brace_s() = (base_y1 - back_root_y()) / sin(tilt);
function back_partner_top_y() = y_back + back_len * sin(tilt) + back_t * cos(tilt);
function fin_x_for(w) = (box_x - w) / 2 - gap;
function screw_world(w) = fin_x_for(w) - fin_t + screw_x;

module m3_hole(h, d) {
  cylinder(h = h, d = d, $fn = 32);
}

// Vertical corners only, so the top and bottom faces stay flat.
module rounded_prism(size, r) {
  hull() {
    for (x = [r, size[0] - r])
      for (y = [r, size[1] - r])
        translate([x, y, 0])
          cylinder(h = size[2], r = r, $fn = 48);
  }
}

module shelf_round(h) {
  translate([0, lip_y0, 0])
    rounded_prism([box_x, base_y1 - lip_y0, h], corner_r);
}

// Solid fill behind the back, from the partner face out to the rear edge
// of the shelf, up to where that face reaches the rear edge.
module back_brace() {
  intersection() {
    hull() {
      translate([0, y_back, base_t])
        rotate([90 - tilt, 0, 0])
          translate([0, -1, -back_t])
            cube([box_x, brace_s() + 1, 1.2]);
      translate([0, back_root_y() - 0.4, base_t])
        cube([box_x, base_y1 - (back_root_y() - 0.4), 2]);
    }
    shelf_round(200);
  }
}

// Ends and the top are rounded. The bottom face stays square so it still
// bites into the shelf, and the student face stays flat for the iPad.
module back_plate() {
  len = back_len + 2;
  thick = back_t;
  r = edge_r;
  translate([0, -2, -thick])
    hull() {
      for (x = [r, box_x - r])
        for (z = [r, thick - r])
          translate([x, 0, z])
            rotate([-90, 0, 0])
              cylinder(h = len - r, r = r, $fn = 32);
      for (z = [r, thick - r])
        translate([r, len - r, z])
          rotate([0, 90, 0])
            cylinder(h = box_x - 2 * r, r = r, $fn = 32);
    }
}

// Straight front, round ends, same thickness the stop slot is cut for.
module lip_wall() {
  span = box_x - 2 * corner_r;
  r = lip_t / 2;
  translate([corner_r, lip_y0, base_t])
    hull() {
      translate([r, r, 0])
        cylinder(h = lip_h, r = r, $fn = 32);
      translate([span - r, r, 0])
        cylinder(h = lip_h, r = r, $fn = 32);
    }
}

module cradle() {
  difference() {
    union() {
      shelf_round(base_t);
      lip_wall();
      translate([0, y_back, base_t])
        rotate([90 - tilt, 0, 0])
          back_plate();
      back_brace();
    }
    translate([
      ring_port_x - ring_port_w / 2,
      ring_port_y - ring_port_h / 2,
      -1
    ])
      cube([ring_port_w, ring_port_h, base_t + 2]);
    for (x = stand_bolt_xs) {
      translate([x, stand_bolt_y, -1])
        m3_hole(base_t + 2, m3_clear);
      translate([x, stand_bolt_y, base_t - cbore_h])
        m3_hole(cbore_h + 1, cbore_d);
    }
  }
}

// Slot faces up. The flat cap is z = 0. The fin is the low-x end.
// The slot runs the whole length, so the lip can slide through. The fin
// stands only on the partner side of the lip.
module stop_solid() {
  y_bead0 = y_lip_partner - clear_y - bead;
  y_fin0 = y_lip_partner - clear_y - fin_depth;
  y_boss0 = y_lip_student + clear_y;
  y_boss1 = y_boss0 + boss_t;
  z_hole = top_t + lip_h / 2;
  fin_z = top_t + lip_h + clear_z - 0.3;
  bead_w = bead + 0.2;

  difference() {
    union() {
      translate([0, y_bead0, 0])
        rounded_prism([stop_len, y_boss0 + 0.4 - y_bead0, top_t], stop_r);
      translate([0, y_bead0, 0])
        rounded_prism([stop_len, bead_w, top_t + bead_h], bead_w / 2);
      translate([0, y_fin0, 0])
        rounded_prism([
          fin_t,
          y_bead0 + bead + 0.2 - y_fin0,
          fin_z
        ], stop_r);
      translate([screw_x - boss_extra / 2, y_boss0 - 0.2, 0])
        rounded_prism([boss_extra, boss_t + 0.2, top_t + lip_h], stop_r);
    }
    translate([-0.2, y_lip_partner - clear_y, top_t - 0.05])
      cube([
        stop_len + 1,
        lip_t + 2 * clear_y,
        lip_h + 2
      ]);
    translate([screw_x, y_boss1 + 1, z_hole])
      rotate([90, 0, 0])
        m3_hole(boss_t + clear_y + 2, m3_pilot);
  }
}

// fin_face is the X of the face that meets the iPad.
module stop_at(fin_face) {
  translate([
    fin_face - fin_t,
    lip_y1 + y_lip_partner,
    lip_top + clear_z + top_t
  ])
    rotate([180, 0, 0])
      stop_solid();
}

module mirror_center() {
  translate([box_x / 2, 0, 0])
    mirror([1, 0, 0])
      translate([-box_x / 2, 0, 0])
        children();
}

module stops_for(w) {
  stop_at(fin_x_for(w));
  mirror_center()
    stop_at(fin_x_for(w));
}

module ipad_ghost(w, h, t) {
  translate([0, y_back, base_t])
    rotate([90 - tilt, 0, 0])
      translate([(box_x - w) / 2, 0.45, 0.35])
        cube([w, h, t]);
}

module assembly() {
  color("ivory")
    cradle();
  color("tan")
    stops_for(281.6);
  color([0.2, 0.45, 0.75, 0.35])
    ipad_ghost(281.6, 215.5, 5.1);
  color([0.15, 0.15, 0.15, 0.25])
    translate([0, 0, -box_z])
      cube([box_x, box_y, box_z]);
}

assert(tilt >= 5 && tilt <= 12, "simple stand tilt must stay in the slight range");
assert(channel >= 9 && channel <= 14, "channel must clear a 7.5 mm iPad and still catch it");
assert(lip_h >= 6, "lip must rise in front of the bottom edge");
assert(lip_y0 >= grill_y1 + 1.2, "lip must stay clear of the speaker grill");
assert(
  stand_bolt_y - cbore_d / 2 >= lip_y1 + 1.0,
  "bolt counterbores must stay clear of the lip"
);
assert(y_back >= ring_port_y + ring_port_h / 2 + 0.5, "back must stay clear of the cable port");
assert(com_y(215.5, 5.1) < box_y - 22, "13 inch iPad center must stay over the box");
assert(top_y(215.5) < box_y - 4, "13 inch iPad top must stay over the lid");
assert(corner_r >= 4 && corner_r <= 8, "cradle corners must stay in the soft range");
assert(2 * corner_r < base_y1 - lip_y0 - 4, "corner radius must fit the shelf");
assert(
  stand_bolt_xs[0] - cbore_d / 2 > corner_r + 2,
  "outer bolt must clear the corner radius"
);
assert(edge_r * 2 < back_t - 0.5, "back edge radius must leave a flat face");
assert(stop_r * 2 < fin_t, "stop corner radius must leave a flat fin");
assert(back_t >= 5, "back must stay thick enough to take a bump");
assert(back_root_y() < base_y1 - 4, "shelf must remain behind the back for the brace");
assert(brace_s() > 40 && brace_s() < back_len - 20, "brace must thicken the lower back");
assert(back_partner_top_y() < box_y - 4, "back must stay over the lid");
assert(back_len >= 134.8, "back must cover an iPad mini");
assert(screw_world(195.4) + boss_extra / 2 + 2 < grill_x0, "mini stop screw must clear the grill");
assert(
  lip_y1 + clear_y + fin_depth < y_back - 2,
  "side fin must stay clear of the back"
);
assert(screw_world(281.6) > 8, "13 inch stop screw must land on the lip");
assert(fin_x_for(281.6) - fin_t + stop_len > 14, "13 inch stop must still grip the lip");
assert(stop_screw - boss_t > clear_y + 0.3, "stop screw must reach the lip");
assert(stop_screw - boss_t < clear_y + 1.2, "stop screw must not pierce the lip");
assert(cradle_screw - (base_t - cbore_h + lid_t) > 3.5, "cradle screw must leave room for a nut");
assert(cbore_d >= 6.0 && cbore_d <= 6.6, "counterbore must fit an M3 socket or pan head");
assert(
  part == "cradle" || part == "stop" || part == "assembly",
  "unknown part"
);

echo(tilt = tilt);
echo(y_back = y_back);
echo(lip_y0 = lip_y0);
echo(lip_y1 = lip_y1);
echo(channel = channel);
echo(com_13 = com_y(215.5, 5.1));
echo(margin_13 = box_y - com_y(215.5, 5.1));
echo(top_13 = top_y(215.5));
echo(back_print_z = back_print_z());
echo(back_t = back_t);
echo(back_root_y = back_root_y());
echo(brace_s = brace_s());
echo(back_partner_top_y = back_partner_top_y());
echo(screw_mini = screw_world(195.4));
echo(screw_13 = screw_world(281.6));

if (part == "cradle")
  cradle();
else if (part == "stop")
  stop_solid();
else if (part == "assembly")
  assembly();
