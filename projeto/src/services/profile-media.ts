import { connectService } from './connect-service';

export async function profilePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024)
    throw Error('Escolha uma imagem JPG, PNG ou WebP de até 4 MB.');
  const bitmap = await createImageBitmap(file);
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
export async function storePrivateRegistration(id: string, file: File) {
  if (
    file.type !== 'application/pdf' ||
    file.size > 1024 * 1024 ||
    (await file.slice(0, 5).text()) !== '%PDF-'
  )
    throw Error('Escolha um PDF fictício de até 1 MB.');
  if (!connectService.isActive(id) || connectService.getAccount(id)?.role !== 'personal')
    throw Error('Perfil não autorizado.');
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('movra-registration-documents', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('private');
    req.onerror = () => reject(Error('O navegador não permitiu guardar o documento.'));
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('private', 'readwrite');
      tx.objectStore('private').put(file, id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(Error('Não foi possível guardar o documento neste navegador.'));
      };
    };
  });
}
