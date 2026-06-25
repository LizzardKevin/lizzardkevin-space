export function FocusExhibitTitle({
  title,
  subtitle,
  visible,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
}) {
  const subtitleCopy = subtitle?.trim();

  return (
    <h1 className={`focus-title${visible ? " focus-title--visible" : ""}`} aria-live="polite">
      <span>{title}</span>
      {subtitleCopy ? (
        <span className="focus-title__subtitle">{subtitleCopy}</span>
      ) : null}
    </h1>
  );
}
