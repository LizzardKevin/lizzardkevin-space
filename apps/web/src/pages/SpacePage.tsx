import type { EntryTransition } from "../entry/entryTypes";
import { EntrySplash } from "../components/entry/EntrySplash";

export function SpacePage({
  entry,
  onTrustedEnter,
}: {
  entry: EntryTransition;
  onTrustedEnter: () => void;
}) {

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {entry.showSplash ? <EntrySplash entry={entry} onEnter={onTrustedEnter} /> : null}
    </div>
  );
}
