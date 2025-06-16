import { JSDOM } from 'jsdom';
import imageToAscii from 'image-to-ascii';
import fs from 'node:fs/promises';
import path from 'node:path';

// Better ASCII settings: fixed width, custom “alphabet” for richer detail,
// slightly sharpen/contrast to preserve edges
const ASCII_ART_OPTIONS = {
  colored: false,
  size: {           // force a specific output width
    width: 80       // try 80 chars wide (adjust up/down for your terminal)
  },
  invert: true,     // dark/light inversion often gives stronger silhouettes
  contrast: 15,     // boost contrast
  sharpen: true,    // sharpen edges
  alphabet: ' .,:;i1tfLCG08@' 
    // from lightest to darkest; choose a ramp that preserves detail
};

export async function processHtmlForMinimalTui(
  htmlFragment: string,
  basePublicDir: string
): Promise<string> {
  const dom = new JSDOM(`<body>${htmlFragment}</body>`);
  const doc = dom.window.document;

  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src')!;
    const alt = img.getAttribute('alt') || '';
    const localPath = path.join(basePublicDir, src.replace(/^\//, ''));
    const ext = path.extname(localPath).toLowerCase();

    // create wrapper
    const figure = doc.createElement('figure');
    figure.className = 'media-block';

    // Convert any common raster image to ASCII—now including .gif
    if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      try {
        await fs.access(localPath);
        console.log(`[TUI] converting to ASCII art: ${src}`);
        const ascii = await new Promise<string>((res, rej) => {
          imageToAscii(localPath, ASCII_ART_OPTIONS, (err, conv) =>
            err ? rej(err) : res(conv)
          );
        });
        const pre = doc.createElement('pre');
        pre.className = 'ascii-art';
        pre.textContent = ascii;
        figure.append(pre);
      } catch (err) {
        console.warn(`[TUI] ASCII conversion failed for ${src}:`, err);
      }
    }

    // always include the original media tag, CSS will show/hide it
    const imgClone = doc.createElement('img');
    imgClone.src = src;
    imgClone.alt = alt;
    imgClone.className = 'media-original';
    figure.append(imgClone);

    img.replaceWith(figure);
  }
  
  return doc.body.innerHTML;
}