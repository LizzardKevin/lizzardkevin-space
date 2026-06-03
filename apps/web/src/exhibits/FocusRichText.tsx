export function FocusRichText({ html }: { html: string }) {
  return <div className="focus-story" dangerouslySetInnerHTML={{ __html: html }} />;
}
