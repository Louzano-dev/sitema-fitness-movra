import { describe, expect, it } from 'vitest';
import { inspectMedia, MEDIA_LIMIT, messageText, VIDEO_LIFETIME } from '@/domain/messaging';

describe('Mensagens locais e anexos', () => {
  it('aceita texto, legenda ou anexo sozinho e rejeita mensagens vazias ou longas', () => {
    expect(messageText('  Ajustar a carga?  ', false)).toBe('Ajustar a carga?');
    expect(messageText('', true)).toBe('');
    expect(() => messageText('  ', false)).toThrow();
    expect(() => messageText('a'.repeat(2001), true)).toThrow();
  });
  it('atribui uma semana ao vídeo, sem expirar automaticamente outros formatos', async () => {
    expect(
      (
        await inspectMedia(
          new File([new Uint8Array([26, 69, 223, 163])], 'treino.webm', { type: 'video/webm' }),
          100,
        )
      ).expiresAt,
    ).toBe(100 + VIDEO_LIFETIME);
    expect(
      (await inspectMedia(new File(['ID3'], 'voz.mp3', { type: 'audio/mpeg' }), 100)).expiresAt,
    ).toBeUndefined();
    expect(
      (
        await inspectMedia(
          new File([new Uint8Array([255, 216, 255])], 'foto.jpg', { type: 'image/jpeg' }),
          100,
        )
      ).kind,
    ).toBe('image');
  });
  it('valida tipo, conteúdo e limites por categoria antes de gravar', async () => {
    await expect(
      inspectMedia(new File(['HTML'], 'arquivo.png', { type: 'image/png' }), 0),
    ).rejects.toThrow('conteúdo');
    await expect(
      inspectMedia(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }), 0),
    ).rejects.toThrow('Escolha');
    await expect(inspectMedia(new File([], 'voz.wav', { type: 'audio/wav' }), 0)).rejects.toThrow(
      'conteúdo',
    );
    await expect(
      inspectMedia(
        new File([new Uint8Array(MEDIA_LIMIT.image + 1)], 'grande.png', { type: 'image/png' }),
        0,
      ),
    ).rejects.toThrow('5 MB');
  });
});
