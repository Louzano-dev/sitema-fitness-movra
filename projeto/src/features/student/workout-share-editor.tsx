'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  AlignLeft,
  CalendarDays,
  Circle,
  CircleCheck,
  Download,
  Flame,
  ImagePlus,
  Share2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkoutShare } from '@/domain/workout-share';
import {
  loadShareFonts,
  renderShareCanvas,
  sharePresentation,
  shareTemplates,
  type ShareFormat,
  type ShareOptions,
} from './workout-share-canvas';

const templateIcons = [AlignLeft, Circle, Type, CircleCheck, Flame, CalendarDays] as const;
const backgrounds = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'alpha', label: 'Transparência' },
] as const;
const photoTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
];

type Prepared = {
  options: ShareOptions;
  photo?: HTMLImageElement;
} & ({ file: File; width: number; height: number; shareable: boolean } | { error: string });

function canShareFile(file: File) {
  try {
    return (
      typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true
    );
  } catch {
    return false;
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="share-slider">
      <span>{label}</span> <span aria-hidden="true">{value}%</span>
      <input
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        aria-valuetext={`${value}%`}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

export default function WorkoutShareEditor({ data }: { data: WorkoutShare }) {
  const [options, setOptions] = useState<ShareOptions>(() => ({
    template: 'editorial',
    format: 'compact',
    tone: 'light',
    accent: true,
    title: false,
    metrics: data.metrics.map(({ id }) => id),
    streak: true,
    weekly: true,
    size: 100,
    x: 50,
    y: 85,
    photoFit: 'cover',
    photoX: 50,
    photoY: 50,
  }));
  const [background, setBackground] = useState<(typeof backgrounds)[number]['value']>('dark');
  const [photo, setPhoto] = useState<HTMLImageElement>();
  const [photoError, setPhotoError] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [status, setStatus] = useState('');
  const [prepared, setPrepared] = useState<Prepared>();
  const photoRevision = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const presentation = sharePresentation(data, options);
  const current = prepared?.options === options && prepared.photo === photo ? prepared : undefined;
  const rendered = current && 'file' in current ? current : undefined;
  const evolution = options.template === 'streak' || options.template === 'weekly';

  useEffect(
    () => () => {
      photoRevision.current++;
    },
    [],
  );

  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let active = true;
    let frame = 0;
    const fail = () => {
      if (active)
        setPrepared({
          options,
          photo,
          error: 'Não foi possível preparar o PNG. Ajuste a composição e tente novamente.',
        });
    };
    void loadShareFonts(presentation.title).then(() => {
      if (!active) return;
      frame = requestAnimationFrame(() => {
        try {
          renderShareCanvas(target, data, options, photo);
          const { width, height } = target;
          target.toBlob((blob) => {
            if (!active) return;
            if (!blob) {
              fail();
              return;
            }
            const filename =
              options.format === 'compact' ? 'movra-figurinha.png' : 'movra-stories.png';
            const file = new File([blob], filename, { type: 'image/png' });
            setPrepared({ options, photo, file, width, height, shareable: canShareFile(file) });
          }, 'image/png');
        } catch {
          fail();
        }
      });
    }, fail);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [data, options, photo, presentation.title]);

  function update(change: Partial<ShareOptions>) {
    setOptions((previous) => ({ ...previous, ...change }));
    setStatus('');
  }

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setPhotoError('');
    if (file.type && !photoTypes.includes(file.type)) {
      setPhotoError('Escolha uma foto em JPG, PNG, WebP, AVIF ou HEIC.');
      return;
    }
    const revision = ++photoRevision.current;
    setLoadingPhoto(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (revision !== photoRevision.current) return;
      setPhoto(image);
      update({ format: 'photo', photoX: 50, photoY: 50 });
    } catch {
      if (revision === photoRevision.current)
        setPhotoError('Não foi possível abrir essa foto. Tente outro arquivo.');
    } finally {
      URL.revokeObjectURL(url);
      if (revision === photoRevision.current) setLoadingPhoto(false);
    }
  }

  function removePhoto() {
    photoRevision.current++;
    setPhoto(undefined);
    setLoadingPhoto(false);
    setPhotoError('');
    if (options.format === 'photo') update({ format: 'story' });
  }

  function save(file: File) {
    downloadFile(file);
    setStatus('Download iniciado.');
  }

  async function share(file: File) {
    if (!canShareFile(file)) {
      save(file);
      return;
    }
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      save(file);
    }
  }

  return (
    <>
      <div className="share-editor">
        <div className="share-preview">
          <div
            className="share-preview-stage"
            data-background={background}
            data-format={options.format}
          >
            <canvas ref={canvas} role="img" aria-label={`Prévia. ${presentation.description}`} />
          </div>
          <div className="share-preview-tools">
            <div className="share-segments" role="group" aria-label="Fundo da prévia">
              {backgrounds.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={background === value}
                  onClick={() => setBackground(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="share-dimensions">
              {rendered ? `PNG · ${rendered.width} × ${rendered.height} px` : 'Preparando prévia…'}
            </p>
          </div>
        </div>
        <div className="share-controls">
          <fieldset className="share-setting">
            <legend>Modelo</legend>
            <div className="share-template-options">
              {shareTemplates.map(({ id, label }, index) => {
                const Icon = templateIcons[index];
                return (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={options.template === id}
                    onClick={() => update({ template: id })}
                  >
                    <Icon size={15} aria-hidden="true" /> {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="share-setting">
            <label>
              Formato
              <select
                className="native-select"
                value={options.format}
                onChange={(event) => update({ format: event.currentTarget.value as ShareFormat })}
              >
                <option value="compact">Figurinha transparente</option>
                <option value="story">Stories transparente</option>
                {photo && <option value="photo">Stories com foto</option>}
              </select>
            </label>
            <div className="share-photo-actions">
              <input
                hidden
                ref={fileInput}
                type="file"
                accept={photoTypes.join(',')}
                onChange={choosePhoto}
              />
              <Button
                type="button"
                variant="outline"
                disabled={loadingPhoto}
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus aria-hidden="true" /> {photo ? 'Trocar foto' : 'Escolher foto'}
              </Button>
              {photo && (
                <Button type="button" variant="ghost" onClick={removePhoto}>
                  Remover foto
                </Button>
              )}
            </div>
            {loadingPhoto && (
              <p className="share-feedback" role="status">
                Abrindo foto…
              </p>
            )}
            {photoError && (
              <p className="share-feedback" role="alert">
                {photoError}
              </p>
            )}
          </div>
          <fieldset className="share-setting share-appearance">
            <legend>Aparência</legend>
            <div className="share-segments" role="group" aria-label="Cor do texto">
              <button
                type="button"
                aria-pressed={options.tone === 'light'}
                onClick={() => update({ tone: 'light' })}
              >
                Branco
              </button>
              <button
                type="button"
                aria-pressed={options.tone === 'dark'}
                onClick={() => update({ tone: 'dark' })}
              >
                Escuro
              </button>
            </div>
            <label className="share-check">
              <input
                type="checkbox"
                checked={options.accent}
                onChange={(event) => update({ accent: event.currentTarget.checked })}
              />
              Detalhes em verde-lima
            </label>
          </fieldset>
          <details className="share-details">
            <summary>Conteúdo da figurinha</summary>
            <div className="share-metric-options">
              {data.title && (
                <label className="share-check">
                  <input
                    type="checkbox"
                    checked={options.title}
                    onChange={(event) => update({ title: event.currentTarget.checked })}
                  />
                  Nome do treino
                </label>
              )}
              {data.metrics.map(({ id, label }) => (
                <label className="share-check" key={id}>
                  <input
                    type="checkbox"
                    checked={options.metrics.includes(id)}
                    onChange={(event) =>
                      update({
                        metrics: event.currentTarget.checked
                          ? [...options.metrics, id]
                          : options.metrics.filter((metric) => metric !== id),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              {evolution && data.habits && (
                <>
                  <label className="share-check">
                    <input
                      type="checkbox"
                      checked={options.streak}
                      onChange={(event) => update({ streak: event.currentTarget.checked })}
                    />
                    Sequência
                  </label>
                  {!!data.habits.target && (
                    <label className="share-check">
                      <input
                        type="checkbox"
                        checked={options.weekly}
                        onChange={(event) => update({ weekly: event.currentTarget.checked })}
                      />
                      Meta da semana da sessão
                    </label>
                  )}
                </>
              )}
              {!data.title && !data.metrics.length && !(evolution && data.habits) && (
                <p>Sem métricas registradas para esta atividade.</p>
              )}
            </div>
          </details>
          <details className="share-details">
            <summary>Tamanho e posição</summary>
            <div className="share-position-options">
              <Slider
                label="Tamanho da figurinha"
                min={65}
                max={130}
                value={options.size}
                onChange={(size) => update({ size })}
              />
              {options.format !== 'compact' && (
                <>
                  <Slider
                    label="Posição horizontal da figurinha"
                    value={options.x}
                    onChange={(x) => update({ x })}
                  />
                  <Slider
                    label="Posição vertical da figurinha"
                    value={options.y}
                    onChange={(y) => update({ y })}
                  />
                </>
              )}
              {options.format === 'photo' && (
                <>
                  <label>
                    Enquadramento da foto
                    <select
                      className="native-select"
                      value={options.photoFit}
                      onChange={(event) =>
                        update({
                          photoFit: event.currentTarget.value === 'contain' ? 'contain' : 'cover',
                        })
                      }
                    >
                      <option value="cover">Preencher Stories</option>
                      <option value="contain">Mostrar a foto inteira</option>
                    </select>
                  </label>
                  <Slider
                    label="Posição horizontal da foto"
                    value={options.photoX}
                    onChange={(photoX) => update({ photoX })}
                  />
                  <Slider
                    label="Posição vertical da foto"
                    value={options.photoY}
                    onChange={(photoY) => update({ photoY })}
                  />
                </>
              )}
            </div>
          </details>
        </div>
      </div>
      <div className="share-export">
        {current && 'error' in current && (
          <p className="share-feedback" role="alert">
            {current.error}
          </p>
        )}
        <p className="share-feedback" role="status">
          {status}
        </p>
        <div className="share-export-actions">
          <Button
            type="button"
            variant={rendered?.shareable ? 'outline' : 'default'}
            disabled={!rendered}
            onClick={() => rendered && save(rendered.file)}
          >
            <Download aria-hidden="true" /> Baixar PNG
          </Button>
          {rendered?.shareable && (
            <Button type="button" onClick={() => share(rendered.file)}>
              <Share2 aria-hidden="true" /> Compartilhar imagem
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
