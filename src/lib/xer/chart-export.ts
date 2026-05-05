// Convert a Recharts SVG (inside a container) to a PNG data URL.
// No external deps — relies on the browser's SVG → <canvas> path.
export async function svgContainerToPng(container: HTMLElement, scale = 2): Promise<string> {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('No SVG found in container');
  // Clone so we can inline computed colors (CSS variables don't survive serialization)
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Inline computed fill/stroke for every element so CSS vars resolve in the snapshot
  const srcNodes = svg.querySelectorAll<SVGElement>('*');
  const dstNodes = clone.querySelectorAll<SVGElement>('*');
  srcNodes.forEach((src, i) => {
    const dst = dstNodes[i];
    if (!dst) return;
    const cs = getComputedStyle(src);
    const fill = cs.fill;
    const stroke = cs.stroke;
    if (fill && fill !== 'none' && !fill.startsWith('url')) dst.setAttribute('fill', fill);
    if (stroke && stroke !== 'none' && !stroke.startsWith('url')) dst.setAttribute('stroke', stroke);
    if (cs.fontFamily) dst.setAttribute('font-family', cs.fontFamily);
    if (cs.fontSize) dst.setAttribute('font-size', cs.fontSize);
  });

  // Solid background so the PNG isn't transparent over a dark UI
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', getComputedStyle(document.body).backgroundColor || '#0b1220');
  clone.insertBefore(bg, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const svg64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('SVG → image load failed'));
    img.src = svg64;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
