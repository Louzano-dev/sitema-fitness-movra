export async function profilePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024)
    throw Error('Escolha uma imagem JPG, PNG ou WebP de até 4 MB.');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw Error('Não foi possível ler a foto selecionada.');
  });
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Este navegador não pode preparar a foto.');
    ctx.drawImage(
      bitmap,
      (bitmap.width - size) / 2,
      (bitmap.height - size) / 2,
      size,
      size,
      0,
      0,
      160,
      160,
    );
    return canvas.toDataURL('image/jpeg', 0.74);
  } finally {
    bitmap.close();
  }
}
