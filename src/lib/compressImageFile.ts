const MAX_IMAGE_DATA_URL_BYTES = 750_000;

function readRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("無法讀取圖片。"));
    };

    reader.onerror = () => {
      reject(new Error("無法讀取圖片。"));
    };

    reader.readAsDataURL(file);
  });
}

async function compressWithCanvas(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1280;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close?.();
    throw new Error("無法處理圖片。");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_IMAGE_DATA_URL_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

export async function readCompressedImageDataUrl(file: File): Promise<string> {
  let dataUrl: string;

  try {
    dataUrl = await compressWithCanvas(file);
  } catch {
    dataUrl = await readRawDataUrl(file);
  }

  if (dataUrl.length > MAX_IMAGE_DATA_URL_BYTES) {
    throw new Error("圖片太大，請選擇較小的照片。");
  }

  return dataUrl;
}
