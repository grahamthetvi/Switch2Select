import { useState } from "react";
import { PartnerPage } from "../components/PartnerPage";
import type { ViewId } from "../nav";
import { useLibrary } from "../state/LibraryContext";

export function Welcome({ request }: { request: (view: ViewId) => void }) {
  const { welcomed, acknowledgeWelcome } = useLibrary();
  const [message, setMessage] = useState<string | null>(null);

  async function continueToPictures() {
    setMessage(null);
    try {
      if (!welcomed) await acknowledgeWelcome();
      request("talk");
    } catch {
      setMessage("Could not save that you have seen this page. The pictures are still on this device.");
    }
  }

  return (
    <PartnerPage
      title="Welcome"
      lede="One picture at a time. A light press means this one. A deep press says it."
      onBack={() => void continueToPictures()}
      backLabel={welcomed ? "Back to pictures" : "Continue to pictures"}
    >
      <section className="panel">
        <h2>How it works</h2>
        <p>The screen stays quiet. One picture is the turn. The child does not have to look at a board of pictures.</p>
        <p>A light press means this one. The picture stays where it is. It does not say the whole message yet.</p>
        <p>A deep press says it. Then there is time to answer. Letting go, or waiting out a light press, says nothing.</p>
        <p>Pictures turned on for today take turns, one after another. About three to eight is easier to see.</p>
        <p>Two pictures is a separate way to use the same library. Each branch holds two pictures. A deep press says the picture, or opens the next pair when that picture has two inside it. Back is a partner control. There is no third picture.</p>
        <p>The library is the photos, the short name, and the words to say. A recorded voice, if you add one, is what a deep press plays. Otherwise this device speaks the words.</p>
        <p>Partner pages — the library, settings, and practice — sit behind a question. A four-number code replaces that question when you set one.</p>
      </section>
      <section className="panel">
        <h2>Privacy</h2>
        <p>Photos, names, recordings, and settings stay in this browser, on this device. This app has no account, and it does not upload them.</p>
        <p>Export writes a zip you choose to keep. The partner code is left out of that file. Import replaces the pictures and settings on this device only after you confirm.</p>
        <p>Removing a background happens in this browser. The model is loaded from this app. The photo is not sent away with it.</p>
        <p>A recorded voice plays from this device. Spoken words use a voice built into the device. A voice that would send the words over the network is not used.</p>
        <p>The browser may ask to keep this site’s storage, so the pictures are less likely to be cleared. You can still remove them from the library, or by clearing this site’s data in the browser.</p>
      </section>
      {message ? <p className="note">{message}</p> : null}
      <div className="row">
        <button type="button" className="button button-strong" onClick={() => void continueToPictures()}>
          Continue to pictures
        </button>
        <button type="button" className="button" onClick={() => request("guide")}>
          Partner guide
        </button>
      </div>
    </PartnerPage>
  );
}
