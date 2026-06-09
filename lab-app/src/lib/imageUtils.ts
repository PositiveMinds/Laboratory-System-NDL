/**
 * Compress an image file to a base64 data URL.
 * - PNG with transparency stays as PNG (preserves alpha channel)
 * - All other formats are converted to JPEG
 * - Iteratively reduces quality until the result fits within maxKB
 */
export async function compressImage(file: File, maxKB: number): Promise<string> {
  const isPng = file.type === 'image/png';
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const maxDim = 800; // max width or height in pixels

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      if (isPng) {
        // Preserve transparency — no white background fill
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // PNG can't be quality-adjusted easily, just return the canvas PNG
        const dataUrl = canvas.toDataURL('image/png');
        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
        if (sizeKB > maxKB) {
          // Scale down further for large PNGs
          const scale = Math.sqrt(maxKB / sizeKB);
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        resolve(canvas.toDataURL('image/png'));
        return;
      }

      // JPEG path — try reducing quality until size fits
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);

      while (sizeKB > maxKB && quality > 0.1) {
        quality = Math.max(0.1, quality - 0.1);
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
      }

      if (sizeKB > maxKB) {
        // Still too big — halve dimensions and retry
        canvas.width = Math.round(width * 0.6);
        canvas.height = Math.round(height * 0.6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
      }

      if (sizeKB > maxKB) {
        reject(new Error(`Image is too large (${sizeKB} KB). Max allowed: ${maxKB} KB after compression.`));
      } else {
        resolve(dataUrl);
      }
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

/** Format byte count as KB */
export function formatKB(dataUrl: string): string {
  return `${Math.round((dataUrl.length * 3) / 4 / 1024)} KB`;
}
