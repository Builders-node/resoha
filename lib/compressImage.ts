/**
 * Стиснення фото в браузері перед завантаженням: довша сторона до 2560 px,
 * WebP (або JPEG, де WebP не кодується), за потреби — ледь помітний знак «resoha»
 * у правому нижньому куті. Якщо щось не вдалось — вантажимо оригінал.
 */
const MAX_SIDE = 2560;
const QUALITY = 0.85;
/** Без знака дрібні файли не чіпаємо: перекодування лише зіпсує якість */
const SMALL = 600 * 1024;

let webpOk: boolean | null = null;
function canWebp() {
  if (webpOk === null) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      webpOk = c.toDataURL('image/webp').startsWith('data:image/webp');
    } catch { webpOk = false; }
  }
  return webpOk;
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.035));
  const pad = Math.round(size * 0.8);
  ctx.save();
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(size / 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText('resoha', w - pad, h - pad);
  ctx.restore();
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

export async function compressImage(file: File, opts: { watermark?: boolean } = {}): Promise<File> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (!opts.watermark && scale === 1 && file.size < SMALL) { bmp.close(); return file; }

    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bmp.close(); return file; }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    if (opts.watermark) drawWatermark(ctx, w, h);

    const type = canWebp() ? 'image/webp' : 'image/jpeg';
    // PNG з прозорістю (лого, план) у JPEG не переводимо — фон став би чорним
    if (type === 'image/jpeg' && file.type === 'image/png' && !opts.watermark) return file;
    const blob = await toBlob(canvas, type);
    if (!blob || blob.type !== type) return file;
    if (!opts.watermark && blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
    return new File([blob], name, { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Стискаємо по черзі по кілька: 50 фото з телефона разом не вміщаються в памʼять */
export async function compressAll(files: File[], opts: { watermark?: boolean } = {}, onEach?: (done: number) => void) {
  const out: File[] = new Array(files.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      out[i] = await compressImage(files[i], opts);
      onEach?.(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
  return out;
}
