export function FocusExhibitTitle({ title, visible }: { title: string; visible: boolean }) {
  return (
    <h1 className={`focus-title${visible ? " focus-title--visible" : ""}`} aria-live="polite">
      {title}
    </h1>
  );
}
