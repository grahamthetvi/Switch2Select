# Switch2Select

Switch2Select is a four-option switch device for students with cortical visual impairment. A student has four direct switches and one scan switch. A partner sees four toy outputs, volume buttons, a device button, and the power switch. One large target is on screen at a time. Choosing an option can light the ring behind that card, speak the port, show a picture, video, or simple game, and briefly close a contact for a battery toy.

An ESP32 DevKit runs an open Wi-Fi access point named Switch2Select and serves the page from a microSD card. A DFRobot Gravity Speech Synthesis Module V2.0 (DFR0760) speaks when no browser page is connected to the device. Two buttons change the volume. A third button, the same size, talks to the screen and repeats which port is in use. A DaierTek 20 mm round SPST rocker switches the USB +5 V lead from a power bank or a 5 V adapter. There is no custom circuit board. Connections are soldered or joined with WAGO 221 connectors.

A rail on the lid holds an iPad, or four 3 by 5 inch cards stood up in place of the iPad. The rail leans 18 degrees back from vertical. There is no lamp above the input jacks. Those lamps would point at the student. The active port is spoken, and the light sits behind the card.

Build in the order below. Flash the board before you close the box. Keep the power source unplugged until the wiring section is finished.

## Tools

- Soldering iron, or WAGO 221 lever connectors if you are not soldering
- Wire strippers
- Flush cutters
- Screwdriver for the lid screws and panel hardware
- 3D printer
- Computer with the Arduino IDE, a USB cable to the ESP32 for programming, and a way to copy files to a microSD card

## Parts

- ESP32 DevKit with USB, 30-pin style
- SPI microSD module
- microSD card you can format as FAT32
- Five panel-mount 3.5 mm mono jacks for the inputs. Each one pushes into a 9.1 mm hole
- Four panel-mount 3.5 mm mono jacks for the toy outputs, in the same 9.1 mm holes
- 4-channel 5 V relay module whose coils are off when the input pin is HIGH
- Four WS2812B rings, 7 LEDs each, 23 mm outside diameter, 5 V, with DIN and DOUT
- One 330 ohm resistor, in series with the ring data line
- One 1000 µF capacitor, 6.3 V or higher, across the ring 5 V and ground at the first ring
- Four 10k resistors for pull-ups
- Three momentary push buttons, 11.8 mm wide. The panel hole is 12.0 mm (11.8 mm plus 0.2 mm clearance) so the button can be pushed in
- DaierTek 20 mm 2-pin SPST round rocker
- DFR0760 speech module with the speaker it ships with
- USB cable for power
- USB power bank or 5 V USB adapter
- Insulated hookup wire
- Four small zip ties, or a dot of hot glue, to keep the rings in their pockets
- PLA or PETG
- Four M3 screws, about 8 mm to 12 mm long, for the lid
- Four M3×20 mm screws and four M3 nuts, to bolt the stand through the lid
- Four M3×10 mm screws, for the two rail extensions
- Two M3×10 mm screws, for the sliding side rails
- Two M3×12 mm screws and two M3 nuts, to join the card halves
- Two M3×12 mm screws and two M3 nuts, for the rear feet

The enclosure corners are drilled for the lid screws. The lid holes are 3.4 mm clearance. Each bottom boss has a 2.8 mm pilot, 10 mm deep. The stand's extension screws and rail screws form their own threads in 2.8 mm pilots. The other new screws use the nuts.

## Print the enclosure

The assembled box is 200 mm by 140 mm by 55 mm, with 2.4 mm walls. Raised numerals and marks stand 0.8 mm off the walls. Braille dots stand 0.9 mm off the walls, so a finished bottom measures about 141.8 mm front to back. Print two parts:

- `enclosure/switch2select-bottom.stl`
- `enclosure/switch2select-lid.stl`

Those files were exported from `enclosure/switch2select.scad`. To export them yourself, open that file in OpenSCAD and set `part` to `"bottom"` or `"lid"`. The value `"both"` draws the bottom and the lid side by side. The customizer accepts `bottom`, `lid`, or `both`.

The two long walls are different. Look at the holes before you wire anything.

The student wall has four 9.1 mm jack holes in a row and one more 9.1 mm jack centered on the lower row. There is no lamp above those jacks. Input holes and output holes are the same size, so the female jack can be pushed in. On the inside of the wall, a cradle 27.3 mm deep holds the whole jack cylinder. A shoulder at the back of the cradle stops that cylinder, and a 7.0 mm hole through the shoulder (a 6.6 mm cord plus 0.4 mm clearance) lets the lead leave the back of the jack. A stem stands just past that hole, beside the cord path, so the lead can be wrapped after it leaves the cylinder and a pull does not yank the jack out. Raised numerals 1, 2, 3, and 4 sit beside the upper jacks. Grade 1 braille for 1, 2, 3, and 4 sits on the other side of those jacks. The center jack is the scan input. The braille word scan sits under it. Braille dots are 0.9 mm high and 1.6 mm across, with 2.5 mm between dot centers in a cell and 6.5 mm between cells. Facing this wall, the four option jacks run left to right as 1, 2, 3, 4. Their centers are 40 mm, 80 mm, 120 mm, and 160 mm from the left end. Input jacks are 28 mm up from the outside bottom. The scan jack is 16 mm up, at the middle of the wall (100 mm from either end).

The partner wall has four 9.1 mm toy-jack holes with the same 27.3 mm cradle, cord hole, and cord stem, and raised numerals 1, 2, 3, and 4. Grade 1 braille for 1, 2, 3, and 4 sits beside those jacks, on the side opposite the numeral. Numeral 1 is at the same end of the box as numeral 1 on the student wall. Toy jacks are 40 mm up from the outside bottom. The lower row, left to right when you face this wall, is:

- Volume down, a 12.0 mm hole (an 11.8 mm button plus 0.2 mm clearance) with a minus mark, 16 mm up. A 9 mm square backing sits 7.55 mm behind the inner face of the wall. Braille for the word minus is under the hole.
- Volume up, the same 12.0 mm hole, 9 mm square backing, and plus mark, 16 mm up. Braille for the word plus is under the hole.
- Device, the same 12.0 mm hole and 9 mm square backing, with a square mark, 16 mm up. Braille for the word use is under the hole. This button does not change the volume and it does not pulse a toy.
- Power rocker, a 20 mm hole, 16 mm up. The body behind the panel is about 25.4 mm deep, with snap wings and two terminals, and the inside stays clear so that body can sit in the box. Braille for the word power sits between this hole and the toy jacks.
- USB cable slot, 12 mm wide by 8 mm tall, centered 16 mm up
- microSD slot, 16 mm wide by 3 mm tall, centered 16 mm up

The lid has a speaker grill in the center. The grilled area is 42 mm by 32 mm, with seven slots, each 3 mm wide. Behind the grill, toward the partner edge, a 12 mm by 10 mm port lets the ring cable into the box. Four 3.4 mm holes in a row take the stand bolts. The lid lip is sized with a 0.4 mm gap inside the bottom rim. If a lid will not seat, sand the lip lightly until it drops in.

Inside, on the floor under that port, two posts and a bar are a tie point for the ring cable.

The enclosure, the stand, and the wiring are CERN-OHL-W v2. If you share a modified enclosure, stand, or wiring layout, release those hardware changes under the same license. The full terms are in the License section.

## Print the stand

The stand sits on the lid. The student looks at the screen or the cards. The partner wall stays open, so the toy plugs, the buttons, the rocker, the USB lead, and the microSD card are still reachable. Two feet drop to the table at the rear corners, clear of those plugs, so a 13 inch iPad does not tip the box.

Print:

- `enclosure/stand-cap.stl`, one. The word FRONT is the student edge. The ring pockets are not on this part. Lay it flat, text up.
- `enclosure/stand-plate.stl`, one. Lay the flat foot on the bed. The back rises from it. The part is about 175 mm tall, so the printer needs that much vertical room.
- `enclosure/stand-extension-left.stl` and `enclosure/stand-extension-right.stl`, one each. Same orientation as the plate. Each is about 138 mm wide and 175 mm tall.
- `enclosure/stand-rail.stl`, two. Print one as exported and mirror the other in the slicer. The slot faces up. The small fin is the side that meets the iPad or the card panel. After mirroring, the two fins face each other.
- `enclosure/stand-cards-left.stl` and `enclosure/stand-cards-right.stl`, one each, only if you want the cards. Lay them with the round pockets up. Numerals 1 and 2 are on the left half. Numerals 3 and 4 are on the right half. Each half is about 183 mm by 151 mm.
- `enclosure/stand-foot.stl`, two. Lay it on the broad face. The screw hole is the short tunnel through the tab.

Those files were exported from `enclosure/stand.scad`. Set `part` to `cap`, `plate`, `extension-left`, `extension-right`, `rail`, `cards-left`, `cards-right`, or `foot`. The value `assembly` draws the stand on the box, with a sample iPad and the card panel in the same ledge so you can see that both fit. You use one or the other, not both at once.

The ledge is 12 mm deep, so a bare iPad from 5.1 mm to 7.5 mm thick sits in it, and so does the card panel. A case has to be thinner than 11 mm. The iPad leans on the back. The lip at the bottom keeps it from sliding toward the student. The side rails set the width. Ticks on the ledge read `mini`, `10`, `13`, and `card`. Snug the rails to the real device. The `10` tick is the 10.2 inch iPad (7th, 8th, and 9th generation). The 10.9 inch and 11 inch Air and Pro models are within 3 mm of that tick.

Landscape widths, long edge on the ledge:

| Model | Width | Height | Thickness |
| --- | --- | --- | --- |
| iPad mini 6 and 7 | 195.4 mm | 134.8 mm | 6.3 mm |
| iPad 9.7 inch | 240 mm | 169.5 mm | 6.1 mm to 7.5 mm |
| iPad 7th, 8th, and 9th generation (10.2 inch) | 250.6 mm | 174.1 mm | 7.5 mm |
| iPad 10th generation and iPad A16 (10.9 inch) | 248.6 mm | 179.5 mm | 7.0 mm |
| iPad Air 11 inch and iPad Pro 11 inch (2018–2022) | 247.6 mm | 178.5 mm | 5.9 mm to 6.1 mm |
| iPad Pro 11 inch M4 | 249.7 mm | 177.5 mm | 5.3 mm |
| iPad Air 13 inch and iPad Pro 12.9 inch | 280.6 mm | 214.9 mm | 5.9 mm to 6.4 mm |
| iPad Pro 13 inch M4 | 281.6 mm | 215.5 mm | 5.1 mm |

Portrait works too. Slide the rails in until they touch the sides. The center plate alone is 200 mm wide, which covers an iPad mini in landscape. Every larger iPad needs the two extensions. The card panel is 349 mm wide, so it needs the extensions too.

The cards are 3 inch by 5 inch (76.2 mm by 127 mm), stood up, four across. The slot is 1.6 mm wider and 1.8 mm deep, so a laminated card slides in from the top. To use a different card, change `card_w` and `card_h` at the top of `enclosure/stand.scad` and export the two card halves again.

Behind each card is a round seat 23.8 mm across and 2.4 mm deep, open on the back, with a 10 mm hole through to the card. That is the pocket for a 23 mm WS2812B ring. The 10 mm hole is smaller than the ring, so the ring cannot fall toward the student. Two 2.6 mm holes beside the seat take a zip tie across the back of the ring. A trench on the back carries the wires to the notch in the plate, then through the port in the cap and the lid.

Bolt the extensions to the plate with the four M3×10 screws. The thin lap on each extension sits in the recess at the end of the plate foot. Bolt the cap and the plate foot to the lid with the four M3×20 screws and nuts. The nuts are on the underside of the lid, so do this before you screw the lid onto the box, or take the lid off to reach them. The four holes are in a row behind the speaker grill. The word FRONT on the cap points at the student. Bolt a foot to each rear tab of the cap. The leg reaches the table.

Slide a side rail onto each end of the ledge and tighten its screw until the rail stays put. For an iPad, set the rails to the width and sit the iPad on the ledge, long edge down, screen toward the student. For cards, screw the two halves together with the two M3×12 screws and nuts. The nuts sit in the hex pockets on the back of the half marked 1 and 2. Press each ring into a pocket from the back, LEDs toward the card, and tie or glue it. Seat the panel in the ledge and bring the rails in against its sides. The cable drops through the port. Tie it to the bar on the floor of the box.

## Flash the firmware

Flash the ESP32 before you mount it and before you depend on the relay pins. The sketch drives the relay outputs HIGH, which holds the coils off.

1. Install the Arduino IDE.
2. In Boards Manager, install the **esp32** package by Espressif Systems.
3. Under Tools, Board, choose **ESP32 Dev Module** (the `esp32dev` board). Leave the other board options at the package defaults unless your DevKit needs a different flash size.
4. In Library Manager, install these libraries:
   - **ArduinoJson** by Benoit Blanchon, version 6. This sketch uses `DynamicJsonDocument`. ArduinoJson 7 does not provide that type.
   - **WebSockets** by Markus Sattler (Links2004). The sketch includes `WebSocketsServer.h` from that library.
   - **DFRobot_SpeechSynthesis_V2**. This library is MIT, copyright DFRobot Co.Ltd. Keep their copyright notice with the library.
   - **Adafruit NeoPixel** by Adafruit. The sketch includes `Adafruit_NeoPixel.h`. On the ESP32 this library drives the rings with the RMT peripheral, so the Wi-Fi radio can stay up.
5. Open `firmware/Switch2Select/Switch2Select.ino`. Leave `pins.h`, `device.h`, `device.cpp`, `web.h`, and `web.cpp` in that same folder. The folder name stays `Switch2Select`.
6. Plug the DevKit into the computer with its own USB cable. The power-bank cable stays unplugged. Select the serial port that appears. If no port appears, install the USB serial driver for the chip on your board.
7. Upload the sketch.
8. Open the Serial Monitor at **115200** baud. After reset, the monitor prints the access-point address. With the ESP32 Arduino core defaults, that address is `192.168.4.1`.

The USB serial port and the speech module both use 115200. They are separate UARTs. Speech is on Serial2, pins 16 and 17, described below.

### Pins

GPIO 0, 2, and 12 are strapping pins. Leave them unconnected.

| Option | Numeral | Input GPIO | Input pull-up | Relay GPIO |
| --- | --- | --- | --- | --- |
| 0 | 1 | 34 | External 10k to 3.3 V | 4 |
| 1 | 2 | 35 | External 10k to 3.3 V | 15 |
| 2 | 3 | 36 | External 10k to 3.3 V | 21 |
| 3 | 4 | 39 | External 10k to 3.3 V | 22 |

Other connections:

- Scan jack: GPIO 32. Internal pull-up. The sketch enables it.
- Volume up (plus button): GPIO 27. Internal pull-up.
- Volume down (minus button): GPIO 33. Internal pull-up.
- Device button (square mark): GPIO 14. Internal pull-up.
- Card rings: GPIO 13 is the data pin. One chain of four 7-LED rings. GPIO 25 and GPIO 26 are unused.
- Speech, Serial2: GPIO 16 is the ESP32 receive pin and goes to the module D/T pin. GPIO 17 is the ESP32 transmit pin and goes to the module C/T pin. 115200 baud, 8 data bits, no parity, 1 stop bit.
- microSD SPI: CS GPIO 5, MOSI GPIO 23, MISO GPIO 19, SCK GPIO 18.

GPIO 34, 35, 36, and 39 are input-only. They have no internal pull-up. Each one needs the external 10k to 3.3 V. The scan, volume, and device pins use the ESP32 internal pull-ups, so they do not get a 10k resistor.

A press is active-low. The firmware accepts it after the pin has been low and stable for 40 ms. Holding a switch does not repeat the action.

## Prepare the microSD card

Format the card FAT32. Copy the files and folders that are inside `sd-card` so that `config.json` sits at the root of the card, next to `www`, `media`, and `games`.

These paths are part of the project:

- `/config.json`
- `/www/index.html`
- `/www/style.css`
- `/www/app.js`
- `/www/switch2select.js`
- `/media/yes.svg`
- `/games/look/index.html`

`yes.svg` is a yellow circle on a black square. The Play page at `/games/look/index.html` shows a yellow shape on black. The shapes are a small circle, a square, and a large circle. The device sends a select when that page loads, which moves the shape from the small circle to the square. Selecting Play again loads the page from the start, so the square is what stays on screen.

The sample `config.json` also points the Look option at `/media/pulse.mp4`. That video file is not in this project. Look stays blank until you add an MP4 at that path or change `src`. The firmware serves `.html`, `.css`, `.js`, `.json`, `.svg`, `.mp4`, `.wav`, `.png`, `.jpg`, and `.jpeg`.

The device reads `/config.json` once at startup. After you edit it, turn the rocker off and on. Use a plain text editor and keep the JSON valid, with exactly four objects in `options`. A file the firmware cannot parse is ignored in memory. The card copy is left as written. The in-memory fallback is auto scan, a 3 second step, a 1 second pulse length, volume 5, and the labels One, Two, Three, and Four, with toy pulses off.

Fields:

- `scanMode` is `"auto"` or `"step"`. Any value other than `"step"` is treated as auto. Auto is the sample and the fallback.
- `scanDelayMs` is how long, in milliseconds, the highlight stays on one option during auto scan. A missing or zero value becomes 3000.
- `outputPulseMs` is how long, in milliseconds, a toy contact stays closed. A missing value becomes 1000. The sample uses 1000, about one second.
- `volume` is an integer from 0 to 9. The sample uses 5. The volume buttons update this field on the card when the card is mounted. Values below 0 or above 9 are clamped.
- `ringLevel` is an integer from 0 to 9. The sample uses 4. It sets how bright the card ring is. 0 leaves the rings off. The device button does not change it. Edit the file and power-cycle to change it. A missing value becomes 4.
- `options` is four entries. Index 0 is numeral 1.

Each option:

- `label` is the short word shown while scanning, and the word spoken when the highlight moves. The firmware keeps 47 characters.
- `phrase` is spoken when that option is selected and the speech module is the one talking. If `phrase` is empty, the module speaks `label`. The firmware keeps 95 characters.
- `type` is `image`, `video`, `game`, or `tts`. An empty or unknown type is treated as `tts`.
- `src` is a path on the card, such as `/media/yes.svg`. Leave it empty for a `tts` option. The firmware keeps 63 characters.
- `background` is the screen color behind the target, as `#RRGGBB`. Empty becomes `#000000`.
- `color` is the word color, as `#RRGGBB`. Empty becomes `#ffff00`.
- `pulseOutput` is `true` or `false`. `true` closes that option's relay for `outputPulseMs` when the option is selected. `false` leaves the toy contact open. A missing flag is false.

The sample card is:

| Numeral | Label | Type | On select | Toy pulse |
| --- | --- | --- | --- | --- |
| 1 | Yes | image | Yellow circle, speaks "Yes" | Yes |
| 2 | Look | video | Plays `/media/pulse.mp4` if you add it, speaks "Look" | No |
| 3 | Play | game | Yellow-shape game, speaks "Play" | No |
| 4 | Help | tts | Shows and speaks "I need help" | Yes |

Backgrounds in the sample are black. Word colors are yellow, except Look, which is red.

## Wiring

Unplug the power bank or adapter. Leave the rocker off. The DevKit may stay on the bench until the joints are done.

The DaierTek rocker switches the USB +5 V lead only. It must not be wired to household mains. Toy jacks are dry contacts on the relay normally-open pair, for a battery toy's own switch circuit. They are not a motor supply and they are not mains.

Use the tip and sleeve lugs on each mono jack. If a jack has an extra lug that switches when a plug is inserted, leave that lug unused.

### Power and ground

Cut the red conductor of the USB power cable and put the rocker in series with it. The rocker has two pins. One pin is the red wire from the power bank or 5 V adapter. The other pin is the switched +5 V that feeds the electronics. Black ground does not go through the rocker. Run ground straight through to:

- ESP32 GND
- Relay module GND
- DFR0760 GND
- SPI microSD module GND

Switched +5 V goes to:

- The ESP32 pin labeled 5V or VIN
- Relay module VCC
- DFR0760 5 V
- The card rings' 5 V pads, with the 1000 µF capacitor across that pair at the first ring

Program the board from the DevKit USB socket with this power cable unplugged, so the computer and the power bank are not both feeding 5 V. The enclosure slot is the exit for the power cable. It is 12 mm by 8 mm.

The 10k pull-ups use the ESP32 pin labeled 3.3V. They do not use 5 V.

### Relays and toy jacks

HIGH on a relay GPIO means the coil is off. The firmware writes HIGH on GPIO 4, 15, 21, and 22 before it sets those pins as outputs, so a reset does not pulse a toy. Use a 4-channel 5 V module that works this way: a HIGH input leaves the coil off, and a LOW input turns that coil on.

If the board has a jumper between JD-VCC and VCC, leave the jumper fitted. The coils then use the same switched 5 V as the rest of the module. This build has no separate coil supply.

One relay channel serves one option:

- Numeral 1, relay input GPIO 4
- Numeral 2, relay input GPIO 15
- Numeral 3, relay input GPIO 21
- Numeral 4, relay input GPIO 22

For each channel, connect the normally-open terminal (NO) and the common terminal (COM) to the tip and sleeve of that option's toy jack. Either lug may take either relay terminal. A dry contact has no polarity from this device. Leave the normally-closed terminal (NC) unconnected. No ESP32 pin connects to a toy jack. The toy plug replaces the toy's own switch: the two conductors that the toy's button used to join. When the firmware selects an option with `pulseOutput` true, it drives that GPIO LOW for `outputPulseMs`, then returns it HIGH.

### Input jacks and volume buttons

Each input jack: sleeve to GND, tip to its GPIO.

- Numeral 1 tip: GPIO 34, and a 10k resistor from that GPIO to 3.3 V
- Numeral 2 tip: GPIO 35, and a 10k resistor from that GPIO to 3.3 V
- Numeral 3 tip: GPIO 36, and a 10k resistor from that GPIO to 3.3 V
- Numeral 4 tip: GPIO 39, and a 10k resistor from that GPIO to 3.3 V
- Scan tip: GPIO 32. Sleeve to GND. No external resistor.

Volume buttons and the device button are momentary switches, not jacks. One side of each button goes to GND.

- Plus button, the volume-up mark: GPIO 27
- Minus button, the volume-down mark: GPIO 33
- Device button, the square mark: GPIO 14

Match numeral 1 on the student wall to numeral 1 on the partner wall. The walls face opposite directions, so the left-hand jack on one wall is not numeral 1 on the other wall.

### Card rings

The rings replace lamps on the student wall. Only the ring behind the highlighted card is on. Its color is that option's `color`. `ringLevel` in `config.json` is 0 through 9. The sample uses 4. Level 0 leaves every ring dark. The firmware never turns all four rings on at once.

Power the rings from the switched 5 V rail, the same rail as the ESP32 VIN pin. Do not power them from the 3.3 V pin. Ground is the common ground. Put the 1000 µF capacitor across 5 V and ground at the first ring.

GPIO 13 goes to the 330 ohm resistor. The other side of the resistor goes to DIN on the port 1 ring. Port 1 is the student's left, the same end as numeral 1. Chain DOUT of each ring to DIN of the next, left to right, port 1 then 2 then 3 then 4. Share 5 V and ground with every ring. Keep the data lead short. These rings usually take the ESP32's 3.3 V data over that short lead. If the first ring never lights, the speech and the page still work.

At startup the firmware lights the port 1 ring and leaves the other three off. That ring follows the highlighted port afterward. The pocket is 23.8 mm across. Seat the ring from the back of the card panel, LEDs toward the card, and hold it with a zip tie through the two holes beside the pocket or with a dot of hot glue. The 10 mm hole in front of the ring lets the light reach the back of the card.

### Speech module

Set the switch on the DFR0760 to UART before you apply power. Connect module 5 V and GND as in the power step. The speaker stays on the module's speaker terminals.

- Module D/T to ESP32 GPIO 16
- Module C/T to ESP32 GPIO 17

D/T is the module's transmit pin. C/T is the module's receive pin. The firmware talks to it at 115200 baud and sends the stored volume after the module answers.

### microSD module

- CS to GPIO 5
- MOSI to GPIO 23
- MISO to GPIO 19
- SCK to GPIO 18
- GND to the common ground

Power the SPI module from the supply printed on that board. A module marked for 5 V, with its own regulator, uses the switched 5 V rail. A 3.3 V module uses the ESP32 3.3 V pin. Seat the module so a card pushed through the 16 mm by 3 mm slot enters the socket.

### Pins to leave alone

Do not use GPIO 0, 2, 12, 25, or 26. Do not land a toy jack, a relay contact, or the rocker on an ESP32 pin. Before you apply power, check that each toy jack's two lugs go only to one relay's NO and COM.

## Assembly

1. Confirm the student wall by the single lower jack with the braille word scan under it. There are no lamp holes on that wall. Confirm the partner wall by the 20 mm rocker hole, the three button holes (minus, plus, and the square mark), and the two slots.
2. Push the four input jacks and the scan jack into the 9.1 mm holes until each 27.3 mm cylinder sits in its cradle against the back shoulder. Feed each lead out through the cord hole and wrap it around the stem just beyond that hole.
3. Push the four toy jacks into the partner-wall holes the same way, each beside its matching numeral, and wrap those leads on the stems beyond the cord holes. Seat each of the three buttons in its hole so it meets the 9 mm square backing. Mount the 20 mm rocker in the lower row. Leave the space behind the rocker clear for the switch body and its two terminals.
4. Route the USB power cable out through the 12 mm by 8 mm slot.
5. Place the microSD socket behind the 16 mm by 3 mm slot.
6. Place the DFR0760 speaker on the inside of the lid, facing the grill. If you are fitting the stand, bolt the cap and the plate to the lid before this lid goes back on the box. The ring cable comes through the 12 mm by 10 mm port and ties to the bar on the floor.
7. Label the outside of the student wall **Inputs** and the outside of the partner wall **Toys**. The raised numerals show which channel is which. The written labels are there so the two jack types are not swapped later.
8. Insert the FAT32 card.
9. Set the lid on the rim and fasten the four M3 screws through the lid into the corner bosses. The stand, if you bolted it to the lid, comes with the lid.

## Power-on test

This is the behavior the firmware and the sample card are written to produce. Work through it in order. Use the sample `config.json`, which is auto mode.

1. Toys unplugged or plugged into the partner-wall jacks only. Turn the rocker on. The relays stay silent and the toy contacts stay open. If the speech module is connected and no browser is open, it says "Port one, Yes". If the card rings are wired, the port 1 ring lights in that option's color and the other three stay off. Nothing on the student wall lights.
2. On a phone, iPad, or computer, join the Wi-Fi network **Switch2Select**. The sketch sets no password.
3. Open `http://192.168.4.1`. The device redirects to the page on the card. You should see a single target, the Yes image (a yellow circle) for the sample's first option. The page says "Port one, Yes".
4. Press the switch plugged into input 1. The page selects Yes. Press input 4. The page selects Help and shows the words for that option. The matching ring is the one that lights.
5. Wait and listen. In the default auto mode the highlight moves about every 3 seconds, the page follows it, and the spoken port changes with it. The ring follows the same port.
6. Press the scan jack while an option is highlighted. In auto mode that press selects the highlighted option. It does the same work as pressing that option's direct jack, including the toy pulse when `pulseOutput` is true.
7. Press the plus and minus buttons. Volume moves in steps from 0 through 9 and is written back to `config.json` on the card. With the page open, that level is the browser speech level. With the page closed, it is the DFR0760 level. Press the device button (the square mark). It does not move the highlight and it does not pulse a toy. It says the port that is in use, for example "Port one, Yes". With the page open, a video starts again from the beginning, and the Look game steps to the next shape.
8. Plug a battery toy's switch lead into toy jack 1 or toy jack 4. Select Yes or Help. The contact closes for about one second (`outputPulseMs` is 1000) and then opens. Select Look or Play. Those sample options have `pulseOutput` false, so their toy jacks stay open.
9. Close the browser page so nothing is connected to the device. Select Help again. The DFR0760 speaks "Port four, I need help". The toy contact still opens when the one-second pulse ends, including while the module is still speaking.

If the page is open and the module still speaks, reload the page. Speech belongs to the browser while a page is connected, and to the DFR0760 when it is not. Joining the Wi-Fi network without opening the page leaves speech on the module.

If the module never speaks with the page closed, check that its switch is on UART, that D/T goes to GPIO 16, and that C/T goes to GPIO 17.

### If a check fails

**Input and toy jacks swapped.** A press on the student wall does nothing to the highlight, because that jack is only a relay contact. A toy plugged into an input jack is on a GPIO and ground, which does not give it a timed relay closure. Turn the rocker off, unplug every toy, and move the jacks: inputs on the wall with the scan jack, toy outputs on the wall with the rocker.

**A relay clicks at boot.** A coil turned on. This firmware holds GPIO 4, 15, 21, and 22 HIGH, and HIGH means the coil is off on the module this guide uses. A click means an IN wire is on the wrong pin, that pin is being held low, or the module turns its coil on when the input is HIGH. Recheck the four relay GPIOs. Leave GPIO 0, 2, and 12 unused.

**No microSD card, or a card the board cannot mount.** Switch2Select still appears, and the relay pins still idle HIGH. The browser reports that the page was not found, because the page files are on the card. Speech uses the fallback words One, Two, Three, and Four. Toy contacts stay open, because that fallback sets every `pulseOutput` flag false. Volume changes last only until power is removed.

## Using the device

A partner prepares the card and the toy leads. A student uses the five switches on the input wall.

There are four options, numbered 1 to 4. Speech names the port that is highlighted, and the ring behind that card is the only one lit. One target fills the screen. Nothing on the input wall points a lamp at the student.

**Auto** is the default (`scanMode` set to `"auto"`). The highlight moves on its own every `scanDelayMs` (3 seconds on the sample card). The scan switch selects the option that is in use. A direct switch selects that option immediately, in auto mode and in step mode.

**Step** (`scanMode` set to `"step"`) does not move the highlight by itself. The scan switch only moves the highlight to the next option. It does not select and it does not pulse a toy. The four direct switches still select.

A selection always updates the ring and the page. It closes that option's toy contact only when `pulseOutput` is true, and only for `outputPulseMs`.

Speech depends on the page:

- While a browser has the page open, the browser speaks and the DFR0760 stays quiet.
- While no page is connected, the DFR0760 speaks the same moments. Moving the highlight speaks "Port one, Yes" and so on: the port, then the option `label`. Selecting an option speaks the port and then `phrase`, or `label` when `phrase` is empty.
- While a browser has the page open, moving the highlight speaks that same port cue. Selecting speaks the phrase, or the label, without the port in front of it, so the screen says the message.

The device button is the square mark on the partner wall. It does not select an option, move the scan, or close a toy contact. It repeats the port that is in use. On the page it also acts on what is already showing. A video plays again from the start. A game receives an interact message. The Look game uses that message to step to the next shape, the same step a selection would make. A picture or words are spoken again. With the page closed, the speech module only repeats the port cue.

On the page, scanning an `image` option shows the picture. Scanning any other type shows the label as a word. Selecting an `image` shows the picture, a `video` plays `src`, a `game` loads `src` in the page, and a `tts` option shows the phrase (or the label if the phrase is empty). For `tts`, the browser speaks that phrase. For the other types, the browser speaks the label.

Words drawn by `style.css` are bold uppercase Arial, with Helvetica Neue and then a generic sans-serif as the font fallbacks. The page uppercases the letters on screen. Speech still says the phrase as it is written in `config.json`. The letter fill is the option `color`. A red outline surrounds each letter. The area behind the target is the option `background`. In the sample, that is yellow letters with a red outline on black, except Look, whose letters are red with the same red outline.

Volume is 0 through 9 on the two partner-wall buttons. The card stores the level.

## Attribution

The interaction pattern is inspired by Chatterbox, designed by Stephan Dobri for Neil Squire / Makers Making Change.

Copyright (c) 2025, Neil Squire. Chatterbox source: https://github.com/makersmakingchange/Chatterbox

Switch2Select firmware, enclosure, and this guide are original.

Copyright (C) 2026 Switch2Select contributors.

Chatterbox firmware and CAD were not copied into this project.

## License

- Firmware is GPL-3.0-or-later. The license text is in [LICENSES/gpl-3.0.txt](LICENSES/gpl-3.0.txt). Copyright (C) 2026 Switch2Select contributors.
- Enclosure and wiring (hardware) are CERN-OHL-W v2. The license text is in [LICENSES/cern_ohl_w_v2.txt](LICENSES/cern_ohl_w_v2.txt). If you share a modified enclosure or wiring, release those hardware changes under the same license.
- This guide is CC BY-SA 4.0. Credit Neil Squire / Makers Making Change for the Chatterbox interaction model this started from, and Switch2Select contributors for this device. The license text is in [LICENSES/cc-by-sa_4.0.txt](LICENSES/cc-by-sa_4.0.txt).
- The DFRobot_SpeechSynthesis_V2 library is MIT, copyright DFRobot Co.Ltd. Keep their notice with the library when you install it.

There is no warranty. Safety and quality of built units are on the maker. The power rocker switches 5 V USB only. It must not be wired to household mains. Toy jacks are dry contacts on the relay normally-open pair, for a battery toy's own switch circuit, not a motor supply or mains.
