import type { ReactNode } from "react";

export function PartnerPage({
  title,
  lede,
  onBack,
  backLabel = "Back to pictures",
  children,
}: {
  title: string;
  lede?: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="partner-page">
      <header className="partner-head">
        <button type="button" className="button" onClick={onBack}>
          {backLabel}
        </button>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </header>
      {children}
    </main>
  );
}
