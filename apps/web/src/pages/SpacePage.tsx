import type { EntryTransition } from "../entry/entryTypes";
import { EntrySplash } from "../components/entry/EntrySplash";

export function SpacePage({
  entry,
  onTrustedEnter,
}: {
  entry: EntryTransition;
  onTrustedEnter: () => void;
}) {
  return entry.showSplash ? <EntrySplash entry={entry} onEnter={onTrustedEnter} /> : null;
}
