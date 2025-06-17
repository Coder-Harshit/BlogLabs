import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DEFAULT_WIDTH = 80;
const RAMP = ' .,-~:;=!*#$@';

async function rasterToAscii(
  filePath: string,
  width = DEFAULT_WIDTH
): Promise<string> {
  // load, grayscale & resize
  const img = sharp(filePath).greyscale().resize({ width });
  const { data, info } = await img
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { height, width: w } = info;

  let ascii = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const val = data[idx];               // 0–255
      const ci = Math.floor((val / 255) * (RAMP.length - 1));
      ascii += RAMP[ci];
    }
    ascii += '\n';
  }
  return ascii;
}

export async function processHtmlForMinimalTui(
  htmlFragment: string,
  publicDir: string
): Promise<string> {
  const dom = new JSDOM(`<body>${htmlFragment}</body>`);
  const doc = dom.window.document;
  const contentDir = path.resolve(process.cwd(), 'src/content');

  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src')!;
    const alt = img.getAttribute('alt') || '';
    const ext = path.extname(src).toLowerCase();
    const figure = doc.createElement('figure');
    figure.className = 'media-block';

    // locate locally under public/ or src/content/
    let fileOnDisk: string|undefined;
    for (const base of [publicDir, contentDir]) {
      const candidate = src.startsWith('/')
        ? path.join(base, src.slice(1))
        : path.join(base, src);
      try { await fs.access(candidate); fileOnDisk = candidate; break; }
      catch {}
    }

    // only convert common rasters if found
    if (fileOnDisk && ['.png','.jpg','.jpeg','.gif'].includes(ext)) {
      try {
        const art = await rasterToAscii(fileOnDisk, 80);
        const pre = doc.createElement('pre');
        pre.className = 'ascii-art';
        pre.textContent = art;
        figure.append(pre);
      } catch {
        /* no-op on conversion errors */
      }
    }

    // always include original (CSS toggles it)
    const imgClone = doc.createElement('img');
    imgClone.src       = src;
    imgClone.alt       = alt;
    imgClone.className = 'media-original';
    figure.append(imgClone);

    img.replaceWith(figure);
  }

  return doc.body.innerHTML;
}