import { useCallback, useRef, useState } from "react";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

/**
 * SVG viewBox-based pan/zoom. World units are millimeters.
 * The viewBox describes which slice of world we're showing inside the SVG element.
 *
 *   worldRect: { x, y, width, height }  — the initial view
 *   viewportSize: { width, height }     — the SVG element's pixel size
 *
 * Returns: { viewBox, onWheel, beginPan, panTo, endPan, screenToWorld, zoomAt }
 */
export default function usePanZoom({ initialWorldRect, viewportSize }) {
  const [viewBox, setViewBox] = useState(initialWorldRect);
  const panState = useRef(null);

  const screenToWorld = useCallback((clientX, clientY, svgEl) => {
    const rect = svgEl.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return {
      x: viewBox.x + sx * viewBox.width,
      y: viewBox.y + sy * viewBox.height,
    };
  }, [viewBox]);

  const zoomAt = useCallback((clientX, clientY, svgEl, factor) => {
    const rect = svgEl.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    const wx = viewBox.x + sx * viewBox.width;
    const wy = viewBox.y + sy * viewBox.height;

    // Clamp zoom by comparing against initial world width.
    const baseW = initialWorldRect.width;
    let nextW = viewBox.width / factor;
    let nextH = viewBox.height / factor;
    const nextZoom = baseW / nextW;
    if (nextZoom < MIN_ZOOM) { nextW = baseW / MIN_ZOOM; nextH = initialWorldRect.height / MIN_ZOOM; }
    if (nextZoom > MAX_ZOOM) { nextW = baseW / MAX_ZOOM; nextH = initialWorldRect.height / MAX_ZOOM; }

    setViewBox({
      x: wx - sx * nextW,
      y: wy - sy * nextH,
      width: nextW,
      height: nextH,
    });
  }, [viewBox, initialWorldRect]);

  const onWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) < Math.abs(e.deltaY) === false) {
      // raw scroll = pan
    }
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, e.currentTarget, factor);
  }, [zoomAt]);

  const beginPan = useCallback((clientX, clientY) => {
    panState.current = { startX: clientX, startY: clientY, startBox: viewBox };
  }, [viewBox]);

  const panTo = useCallback((clientX, clientY, svgEl) => {
    if (!panState.current) return;
    const rect = svgEl.getBoundingClientRect();
    const dxScreen = clientX - panState.current.startX;
    const dyScreen = clientY - panState.current.startY;
    const dxWorld = (dxScreen / rect.width) * panState.current.startBox.width;
    const dyWorld = (dyScreen / rect.height) * panState.current.startBox.height;
    setViewBox({
      x: panState.current.startBox.x - dxWorld,
      y: panState.current.startBox.y - dyWorld,
      width: panState.current.startBox.width,
      height: panState.current.startBox.height,
    });
  }, []);

  const endPan = useCallback(() => { panState.current = null; }, []);

  const reset = useCallback(() => setViewBox(initialWorldRect), [initialWorldRect]);

  // suppress unused warning until we wire keyboard navigation.
  void viewportSize;

  return { viewBox, onWheel, beginPan, panTo, endPan, screenToWorld, zoomAt, reset };
}
