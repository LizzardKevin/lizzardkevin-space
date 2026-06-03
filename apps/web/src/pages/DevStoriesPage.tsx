export function DevStoriesPage() {
  return (
    <div className="overlay-tab-content">
      <h1 style={{ fontSize: 22, margin: 0 }}>DevStories</h1>
      <p style={{ marginTop: 12, lineHeight: 1.6, maxWidth: 760, opacity: 0.85 }}>
        这里是开发日志页（占位）。后续会做「文章列表 + 详情页」，内容来源可选：
      </p>
      <ol style={{ marginTop: 8, lineHeight: 1.7, maxWidth: 760, opacity: 0.82 }}>
        <li>Sanity（推荐）：用 studio 里的 devLogPost。</li>
        <li>本地 MDX：用 mdx 内容目录生成列表与详情。</li>
      </ol>
      <p style={{ marginTop: 12, lineHeight: 1.6, maxWidth: 760, opacity: 0.7 }}>
        说明文档在项目根目录的 <code>docs/devstories.md</code>。
      </p>
    </div>
  );
}
