export type MediaKind = 'image' | 'audio' | 'video';
export const VIDEO_LIFETIME = 7 * 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;
export const MEDIA_LIMIT = { image: 5 * MB, audio: 8 * MB, video: 20 * MB };
export const DEVICE_MEDIA_LIMIT = 80 * MB;
export const THREAD_MEDIA_LIMIT = 40 * MB;
export const MAX_MESSAGE_LENGTH = 2000;

const types = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/webm': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
} as const;
export const acceptedMedia = Object.keys(types).join(',');
export interface Attachment {
  kind: MediaKind;
  name: string;
  size: number;
  expiresAt?: number;
  expired?: boolean;
}
export interface ChatMessage {
  id: string;
  thread: string;
  sender: string;
  recipient: string;
  text: string;
  createdAt: number;
  order?: number;
  readAt?: number;
  attachment?: Attachment;
}
export async function inspectMedia(file: File, now: number): Promise<Attachment> {
  const mime = file.type.split(';')[0].toLowerCase() as keyof typeof types;
  const kind = Object.hasOwn(types, mime) ? types[mime] : undefined;
  if (!kind)
    throw new Error(
      'Escolha uma foto JPEG, PNG ou WebP, um áudio MP3, MP4, WebM, Ogg ou WAV, ou um vídeo MP4 ou WebM.',
    );
  if (!file.size || file.size > MEDIA_LIMIT[kind]) {
    throw new Error('O arquivo precisa ter conteúdo e até ' + MEDIA_LIMIT[kind] / MB + ' MB.');
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const header = String.fromCharCode(...bytes);
  const webm = header.startsWith('\x1a\x45\xdf\xa3');
  const mp4 = header.slice(4, 8) === 'ftyp';
  const signatures: Record<keyof typeof types, boolean> = {
    'image/png': header.startsWith('\x89PNG\r\n\x1a\n'),
    'image/jpeg': header.startsWith('\xff\xd8\xff'),
    'image/webp': header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP',
    'audio/mpeg': header.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224),
    'audio/mp4': mp4,
    'video/mp4': mp4,
    'audio/webm': webm,
    'video/webm': webm,
    'audio/ogg': header.startsWith('OggS'),
    'audio/wav': header.startsWith('RIFF') && header.slice(8, 12) === 'WAVE',
    'audio/x-wav': header.startsWith('RIFF') && header.slice(8, 12) === 'WAVE',
  };
  if (!signatures[mime])
    throw new Error('O conteúdo do arquivo não corresponde ao formato informado.');
  return {
    name: file.name.slice(0, 180) || kind,
    kind,
    size: file.size,
    ...(kind === 'video' ? { expiresAt: now + VIDEO_LIFETIME } : {}),
  };
}
export function messageText(input: string, attached: boolean) {
  const value = input.trim();
  if (!value && !attached) throw new Error('Escreva uma mensagem ou selecione um arquivo.');
  if (value.length > MAX_MESSAGE_LENGTH) throw new Error('Use até 2.000 caracteres por mensagem.');
  return value;
}
