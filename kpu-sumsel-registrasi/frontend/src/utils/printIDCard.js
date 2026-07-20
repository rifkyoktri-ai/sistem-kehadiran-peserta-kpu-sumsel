import jsPDF from 'jspdf';

function toDataURL(src) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      res(c.toDataURL('image/png'));
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function prepareClone(element) {
  const clone = element.cloneNode(true);
  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(imgs.map(async (img) => {
    const dataUrl = await toDataURL(img.src);
    if (dataUrl) img.src = dataUrl;
  }));
  return clone;
}

export async function cetakIDCard(nomorUrut = 'IDCard') {
  const element = document.getElementById('id-card-print');
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (!w || !h) return;

  const clone = await prepareClone(element);

  const xmlns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(xmlns, 'svg');
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const foreign = document.createElementNS(xmlns, 'foreignObject');
  foreign.setAttribute('width', '100%');
  foreign.setAttribute('height', '100%');
  foreign.setAttribute('requiredExtensions', 'http://www.w3.org/1999/xhtml');
  foreign.appendChild(clone);
  svg.appendChild(foreign);

  const svgStr = new XMLSerializer().serializeToString(svg);

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('SVG foreignObject gagal'));
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  });

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);

  const ratio = w / h;
  const pdfW = 105;
  const pdfH = pdfW / ratio;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfW, pdfH],
  });

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);
  pdf.save(`IDCard-${nomorUrut}.pdf`);
}
