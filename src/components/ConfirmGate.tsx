import { useEffect, useRef, useState } from "react";

export function ConfirmGate({
  pin,
  onStay,
  onContinue,
}: {
  pin: string;
  onStay: () => void;
  onContinue: (stayUnlocked: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [entered, setEntered] = useState("");
  const [miss, setMiss] = useState(false);
  const [stayUnlocked, setStayUnlocked] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function addDigit(digit: string) {
    const next = `${entered}${digit}`.slice(0, 4);
    setMiss(false);
    if (next.length < 4) {
      setEntered(next);
      return;
    }
    if (next === pin) onContinue(stayUnlocked);
    else {
      setEntered("");
      setMiss(true);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="gate"
      aria-labelledby="gate-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <div className="gate-inner">
        <h1 id="gate-title">Leave the talking screen?</h1>
        <p>Wait with them first. This opens partner tools.</p>
        {pin ? (
          <>
            <p className="gate-code" aria-live="polite">
              {miss ? "That code did not match." : "Enter the partner code."}
            </p>
            <p className="gate-dots" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} className={index < entered.length ? "dot is-filled" : "dot"} />
              ))}
            </p>
            <div className="pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
                <button key={digit} type="button" className="button pad-key" onClick={() => addDigit(digit)}>
                  {digit}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="gate-actions">
            <button type="button" className="button button-strong" onClick={onStay}>
              Stay here
            </button>
            <button type="button" className="button button-strong" onClick={() => onContinue(stayUnlocked)}>
              Continue
            </button>
          </div>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={stayUnlocked}
            onChange={(event) => setStayUnlocked(event.target.checked)}
          />
          <span>Don’t ask again this sitting</span>
        </label>
        {pin ? (
          <button type="button" className="button" onClick={onStay}>
            Stay here
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
