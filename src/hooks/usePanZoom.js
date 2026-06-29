import { useCallback, useRef, useState } from "react";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

function svgViewport(rect, viewBox) {
  const rectRatio = rect.width / rect.height;
  const viewRatio = viewBox.width / viewBox.height;
  if (rectRatio > viewRatio) {
    const width = rect.height * viewRatio;
    return { x: (rect.width - width) / 2, y: 0, width, height: rect.height };
  }
  const height = rect.width / viewRatio;
  return { x: 0, y: (rect.height - height) / 2, width: rect.width, height };
}

function pointerFractions(clientX, clientY, svgEl, viewBox) {
  const rect = svgEl.getBoundingClientRect();
  const viewport = svgViewport(rect, viewBox);
  return {
    sx: (clientX - rect.left - viewport.x) / viewport.width,
    sy: (clientY - rect.top - viewport.y) / viewport.height,
    viewport,
  };
}

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
    const { sx, sy } = pointerFractions(clientX, clientY, svgEl, viewBox);
    return {
      x: viewBox.x + sx * viewBox.width,
      y: viewBox.y + sy * viewBox.height,
    };
  }, [viewBox]);

  const zoomAt = useCallback((clientX, clientY, svgEl, factor) => {
    const { sx, sy } = pointerFractions(clientX, clientY, svgEl, viewBox);
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
    e.preventDefault();
    if (!e.ctrlKey && !e.metaKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const viewport = svgViewport(rect, viewBox);
      setViewBox(current => ({
        x: current.x + (e.deltaX / viewport.width) * current.width,
        y: current.y + (e.deltaY / viewport.height) * current.height,
        width: current.width,
        height: current.height,
      }));
      return;
    }
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, e.currentTarget, factor);
  }, [viewBox, zoomAt]);

  const beginPan = useCallback((clientX, clientY) => {
    panState.current = { startX: clientX, startY: clientY, startBox: viewBox };
  }, [viewBox]);

  const panTo = useCallback((clientX, clientY, svgEl) => {
    if (!panState.current) return;
    const rect = svgEl.getBoundingClientRect();
    const dxScreen = clientX - panState.current.startX;
    const dyScreen = clientY - panState.current.startY;
    const viewport = svgViewport(rect, panState.current.startBox);
    const dxWorld = (dxScreen / viewport.width) * panState.current.startBox.width;
    const dyWorld = (dyScreen / viewport.height) * panState.current.startBox.height;
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
