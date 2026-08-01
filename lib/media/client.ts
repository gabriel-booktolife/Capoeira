"use client";

const MAX_IMAGE_BYTES = 1_200_000;
const MAX_VIDEO_INPUT_BYTES = 75_000_000;
const MAX_VIDEO_SECONDS = 90;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem otimizada.")), "image/webp", quality);
  });
}

export async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let quality = 0.84;
    let blob = await canvasToBlob(canvas, quality);
    while (blob.size > MAX_IMAGE_BYTES && quality > 0.36) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }
    if (blob.size > MAX_IMAGE_BYTES) throw new Error("A imagem continuou muito grande após a otimização. Escolha uma imagem menor.");
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}

function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = "metadata";
    video.onloadedmetadata = () => { cleanup(); resolve(video.duration); };
    video.onerror = () => { cleanup(); reject(new Error("Não foi possível ler o vídeo.")); };
    video.src = url;
  });
}

export async function readMediaMetadata(file: File) {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    try { return { width: bitmap.width, height: bitmap.height }; } finally { bitmap.close(); }
  }
  return new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration }); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível validar os metadados da mídia.")); };
    video.src = url;
  });
}

export async function compressVideo(file: File, onProgress: (message: string) => void) {
  if (file.size > MAX_VIDEO_INPUT_BYTES) throw new Error("Envie um vídeo de até 75 MB.");
  const duration = await videoDuration(file);
  if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) throw new Error("O vídeo pode ter no máximo 90 segundos.");
  onProgress("Carregando o otimizador de vídeo…");
  const [{ FFmpeg }, { fetchFile }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ffmpeg = new FFmpeg();
  try {
    await ffmpeg.load();
    onProgress("Otimizando o vídeo…");
    await ffmpeg.writeFile("input.mp4", await fetchFile(file));
    await ffmpeg.exec(["-i", "input.mp4", "-vf", "scale='min(960,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "output.mp4"]);
    const result = await ffmpeg.readFile("output.mp4");
    if (!(result instanceof Uint8Array)) throw new Error("Falha ao finalizar o vídeo.");
    const bytes = new Uint8Array(result.byteLength);
    bytes.set(result);
    return new File([bytes.buffer], file.name.replace(/\.[^.]+$/, ".mp4"), { type: "video/mp4" });
  } finally {
    ffmpeg.terminate();
  }
}

export async function compressMedia(file: File, onProgress: (message: string) => void) {
  if (file.type.startsWith("video/")) return compressVideo(file, onProgress);
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem ou um vídeo válido.");
  onProgress("Otimizando a imagem…");
  return compressImage(file);
}
