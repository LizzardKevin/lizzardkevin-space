/** Gallery entrance now controls visibility/energy use, without a separate slide animation. */
export function observeGalleryVisibility(track: HTMLElement, onVisible: (visible: boolean) => void): () => void {
  let intersects = true;
  const update = () => onVisible(intersects && !document.hidden);
  const observer = new IntersectionObserver(entries => {
    intersects = entries[0]?.isIntersecting ?? false;
    update();
  });
  observer.observe(track);
  document.addEventListener("visibilitychange", update);
  update();
  return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
}
