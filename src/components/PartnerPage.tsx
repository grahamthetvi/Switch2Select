import type { ReactNode } from "react";

export function PartnerPage({
  title,
  lede,
  onBack,
  children,
}: {
  title: string;
  lede?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main className="partner-page">
      <header className="partner-head">
        <button type="button" className="button" onClick={onBack}>
          Back to pictures
        </button>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </header>
      {children}
    </main>
  );
}
