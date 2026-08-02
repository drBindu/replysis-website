// Shared imperative motion store, read inside each scene's render loop so the
// WebGL canvases update every frame without triggering React re-renders.
// Framer Motion's useMotionValueEvent writes into this; the raw Three.js
// scenes in this directory read it directly.
export const scrollState = {
  hero: 0, // hero section scroll progress 0 -> 1
  story: 0, // pinned story-section scroll progress 0 -> 1
  product: 0, // product section scroll progress 0 -> 1
  closing: 0, // closing section scroll progress 0 -> 1
  mouseX: 0, // -1 -> 1
  mouseY: 0, // -1 -> 1
};

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      scrollState.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );
}
