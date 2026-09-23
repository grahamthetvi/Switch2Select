# Switch2Select

One picture at a time, for a child whose vision is unreliable and whose reliable motor skill is two depths of press.

Light press means “this one.” Deep press says it. The picture stays still. The partner can finish the turn even if gaze never settles.

Photos stay in the browser. Nothing is uploaded.

## Run

```bash
npm install
npm run dev
```

`npm run build` also downloads the on-device background-removal model into `public/bg` (about 60 MB, from IMG.LY’s data package, then served by this app). `npm run fetch-models` does that step on its own. `npm test` checks the press timing.

The dev server sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so background removal can run its model. A static host needs those same headers.

## Presses

| Input | Light press | Deep press | Let go |
| --- | --- | --- | --- |
| Keyboard | Space | Enter, or Space again with One switch on | Escape |
| Pointer on the picture | Short hold | Longer hold, or right-click | Release before the deep hold |
| Gamepad | Button 0 (change in Practice) | Button 1, or the same button again with One switch on | |
| Left / right arrows | | | Previous / next picture |

A dual switch can send Space and Enter. One switch uses Space twice, or a hold, after you turn on **One switch** in Settings. An adapter can also dispatch:

```js
window.dispatchEvent(new CustomEvent("switch2select:input", {
  detail: { level: "in" } // "in" | "commit" | "cancel"
}));
```

Same two presses on the single-picture screen, the two-picture screen, and Practice.

## Two pictures

Two-choice is optional. Each branch holds two pictures. A light press holds one. A deep press says it, or opens the next pair when that picture has two inside it. Back uses the partner control, not a third picture. With One switch on, the offer takes turns by itself.

## Privacy

Vocabulary, photos, and recordings live in IndexedDB on the device. Export writes a zip the partner chooses to keep. Background removal runs in the browser. The model files are loaded from this app’s `/bg` folder, not sent with the student’s photo.

Background removal uses `@imgly/background-removal` (AGPL-3.0). The rest of this project is MIT.
