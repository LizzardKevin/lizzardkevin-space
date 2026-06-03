export function DevStoriesPage() {
  return (
    <div className="overlay-tab-content">
      <h1 style={{ fontSize: 22, margin: 0 }}>DevStories</h1>
      <p style={{ marginTop: 12, lineHeight: 1.6, maxWidth: 760, opacity: 0.85 }}>
        这里是开发日志页（占位）。后续会做「文章列表 + 详情页」，内容在本地 Markdown 维护。
      </p>
      <ol style={{ marginTop: 8, lineHeight: 1.7, maxWidth: 760, opacity: 0.82 }}>
        <li>
          仓库内 <code>docs/devlog/</code> 编写日志（如 DevLog 系列）
        </li>
        <li>可选：在应用内增加 MDX 内容目录，构建时生成列表与详情</li>
      </ol>
      <p style={{ marginTop: 12, lineHeight: 1.6, maxWidth: 760, opacity: 0.7 }}>
        说明文档见项目根目录 <code>docs/devstories.md</code>。
      </p>
    </div>
  );
}
