'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageUp, ScanLine } from 'lucide-react';
import { inviteCredential } from '@/services/connect-service';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Feedback } from '@/components/shared';
import { Button } from '@/components/ui/button';

export function InviteQr({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 256, margin: 4, errorCorrectionLevel: 'M' }).then(
      (value) => {
        if (active) setSrc(value);
      },
      () => {
        if (active) setError('Use o link de convite para continuar.');
      },
    );
    return () => {
      active = false;
    };
  }, [url]);
  return src ? (
    // Embedded QR data is generated locally and must also work under file://.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="QR Code do convite individual" src={src} width={192} height={192} />
  ) : (
    <Feedback error={error} />
  );
}
function qrCredential(value: string) {
  const code = inviteCredential(value);
  if (!/^(?:MOVRA-[a-f\d]{8}|[a-f\d]{48})$/i.test(code)) {
    throw Error('Este QR não contém um convite MOVRA. Use o QR ou o código enviado pelo personal.');
  }
  return code;
}

async function readImage(file: File) {
  if (file.size > 12_000_000) throw Error('Escolha uma imagem de até 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw Error('Imagem ilegível. Tente outra imagem nítida do QR ou cole o link.');
    }
    const ratio = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Leitura de imagem indisponível. Cole o código ou o link.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const result = jsQR(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
    );
    if (!result)
      throw Error('QR Code ilegível. Envie uma imagem que mostre o QR inteiro ou cole o link.');
    return qrCredential(result.data);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function InviteScanner({
  onScan,
  onStart,
  disabled,
}: {
  onScan: (value: string) => void;
  onStart: () => void;
  disabled: boolean;
}) {
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [reading, setReading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const scanButton = useRef<HTMLButtonElement>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function close() {
    setCamera(false);
    scanButton.current?.focus();
  }
  return (
    <div className="connect-alternatives">
      <div className="connect-divider">
        <span>Ou use um QR Code</span>
      </div>
      <div className="connect-qr-actions">
        <Button
          ref={scanButton}
          type="button"
          variant="outline"
          disabled={disabled || reading}
          aria-expanded={camera}
          onClick={() => {
            if (camera) {
              close();
              return;
            }
            onStart();
            setError('');
            setCamera(true);
          }}
        >
          <ScanLine aria-hidden /> Escanear QR
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || reading}
          onClick={() => imageInput.current?.click()}
        >
          <ImageUp aria-hidden />
          {reading ? 'Lendo imagem…' : 'Enviar imagem'}
        </Button>
        <input
          ref={imageInput}
          hidden
          aria-label="Imagem do QR Code"
          type="file"
          accept="image/*"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            onStart();
            setCamera(false);
            setReading(true);
            setError('');
            try {
              const code = await readImage(file);
              if (active.current) onScan(code);
            } catch (reason) {
              if (active.current)
                setError(
                  reason instanceof Error
                    ? reason.message
                    : 'Falha ao ler o QR. Cole o código ou o link.',
                );
            } finally {
              if (active.current) setReading(false);
            }
          }}
        />
      </div>
      {camera && (
        <CameraScanner
          onRead={(value) => {
            close();
            try {
              onScan(qrCredential(value));
            } catch (reason) {
              setError((reason as Error).message);
            }
          }}
          onError={(message) => {
            close();
            setError(message);
          }}
          onClose={close}
        />
      )}
      {error && (
        <p className="connect-note" data-error="true" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function cameraError(reason: unknown) {
  if (reason instanceof DOMException) {
    if (reason.name === 'NotAllowedError' || reason.name === 'SecurityError')
      return 'Permissão de câmera negada. Autorize o acesso no navegador ou envie uma imagem.';
    if (reason.name === 'NotFoundError' || reason.name === 'OverconstrainedError')
      return 'Nenhuma câmera disponível. Envie uma imagem do QR ou cole o código.';
    if (reason.name === 'NotReadableError')
      return 'Câmera ocupada ou indisponível. Feche outros aplicativos ou envie uma imagem.';
  }
  return 'Falha ao iniciar a câmera. Tente novamente ou envie uma imagem do QR.';
}

function CameraScanner({
  onRead,
  onError,
  onClose,
}: {
  onRead: (text: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onRead, onError });
  useEffect(() => {
    callbacks.current = { onRead, onError };
  }, [onRead, onError]);
  useEffect(() => {
    let finished = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      finished = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    async function start() {
      await Promise.resolve();
      if (finished) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        callbacks.current.onError(
          'Este navegador não oferece acesso à câmera. Envie uma imagem ou cole o código.',
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (finished || !video.current) {
          stop();
          return;
        }
        const el = video.current;
        el.srcObject = stream;
        await el.play();
        if (finished) return;
        setReady(true);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw Error();
        const scan = () => {
          if (finished) return;
          try {
            if (el.readyState >= 2 && el.videoWidth && el.videoHeight) {
              const scale = Math.min(1, 720 / Math.max(el.videoWidth, el.videoHeight));
              const width = Math.max(1, Math.round(el.videoWidth * scale));
              const height = Math.max(1, Math.round(el.videoHeight * scale));
              if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
              }
              ctx.drawImage(el, 0, 0, width, height);
              const result = jsQR(ctx.getImageData(0, 0, width, height).data, width, height);
              if (result) {
                stop();
                callbacks.current.onRead(result.data);
                return;
              }
            }
            timer = setTimeout(scan, 250);
          } catch {
            stop();
            callbacks.current.onError('Falha ao ler a câmera. Envie uma imagem ou cole o código.');
          }
        };
        scan();
      } catch (reason) {
        if (!finished) {
          stop();
          callbacks.current.onError(cameraError(reason));
        }
      }
    }
    void start();
    return stop;
  }, []);
  return (
    <div className="connect-camera">
      <video ref={video} muted playsInline aria-label="Câmera para leitura do convite" />
      <p role="status">
        {ready ? 'Enquadre o QR inteiro na câmera.' : 'Aguardando acesso à câmera…'}
      </p>
      <Button type="button" variant="outline" onClick={onClose}>
        Fechar câmera
      </Button>
    </div>
  );
}
