export const STUDIO_ICON_PRESETS: { label: string; url: string }[] = [
  { label: 'Hypercar Racing', url: '/src/assets/images/icon_apex_drift_1794991680528.jpg' },
  { label: 'Emerald RPG', url: '/src/assets/images/icon_aethel_realm_1794991681265.jpg' },
  { label: 'Pro Camera', url: '/src/assets/images/icon_luminary_editor_1794991682047.jpg' },
  { label: 'FinTech Cards', url: '/src/assets/images/icon_takaflow_wallet_1794991682285.jpg' },
];

export async function compressImageFile(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const targetW = Math.max(1, Math.round(img.width * ratio));
        const targetH = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
