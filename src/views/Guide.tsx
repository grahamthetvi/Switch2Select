import { PartnerPage } from "../components/PartnerPage";
import type { ViewId } from "../nav";

export function Guide({ request }: { request: (view: ViewId) => void }) {
  return (
    <PartnerPage
      title="Partner guide"
      lede="The child is finding one flashlight in fog. Make one flashlight. Give them time."
      onBack={() => request("talk")}
    >
      <section className="panel">
        <h2>Wait</h2>
        <p>One picture. Let it land. A new picture needs a quiet moment before a press counts.</p>
        <p>If their eyes never settle, the press still counts. Deep press is the message.</p>
        <p>Do not fill the silence. The picture is the turn.</p>
      </section>
      <section className="panel">
        <h2>The two presses</h2>
        <p>Light press means this one. The picture stays. It does not say the whole message yet.</p>
        <p>Deep press says it. Then wait, so you can answer them.</p>
        <p>Escape, or letting a light press time out, undoes it. Nothing is said. No correction.</p>
      </section>
      <section className="panel">
        <h2>On this device</h2>
        <ul>
          <li>Space, or a short hold on the picture: light press</li>
          <li>Enter, a longer hold, or a right-click: deep press</li>
          <li>Escape: let go</li>
          <li>Left and right arrows: previous and next picture</li>
        </ul>
        <p>A gamepad can use two buttons. Set which ones in Practice. Button 0 and button 1 are the start.</p>
      </section>
      <section className="panel">
        <h2>A dual switch</h2>
        <p>Point the light switch at Space and the deep switch at Enter. That is enough.</p>
        <p>Or send this event from an adapter. Photos never go with it.</p>
        <pre>{`window.dispatchEvent(new CustomEvent("switch2select:input", {
  detail: { level: "in" }
}));`}</pre>
        <p><code>level</code> is <code>"in"</code>, <code>"commit"</code>, or <code>"cancel"</code>.</p>
      </section>
      <section className="panel">
        <h2>Pictures</h2>
        <p>Use photos from their life. Remove the background so one person or one thing sits alone.</p>
        <p>Keep today small. Three to eight pictures. Two pictures is a separate mode, for a day that can hold a choice. One control returns to a single picture.</p>
      </section>
    </PartnerPage>
  );
}
