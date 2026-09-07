/** 警戒斜纹细分隔线（舟味工业节奏线，克制使用）。 */
export function HazardRule({ className }: { className?: string }) {
  return <div className={`ark-hazard${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}

/** 章节头：等宽编号 + 衬线大标题 + 副标题。 */
export function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="ark-section-head">
      {number ? <span className="ark-section-head__number">{number}</span> : null}
      <div className="ark-section-head__text">
        <h2 className="ark-section-head__title">{title}</h2>
        {subtitle ? <p className="ark-section-head__subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}

/** 标签芯片：直角、细框、等宽。 */
export function TagChip({ label }: { label: string }) {
  return <span className="ark-chip">{label}</span>;
}

export function TagRow({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="ark-chip-row">
      {tags.map((tag) => (
        <TagChip key={tag} label={tag} />
      ))}
    </div>
  );
}

/** 等宽数据带：label/value 网格行（编号、坐标、状态等工业数据呈现）。 */
export function DataStrip({
  items,
  className,
}: {
  items: { label: string; value: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <dl className={`ark-datastrip${className ? ` ${className}` : ""}`}>
      {items.map((item) => (
        <div className="ark-datastrip__item" key={`${item.label}-${item.value}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
