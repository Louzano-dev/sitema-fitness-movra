import { brandMarkPath } from '@/components/brand';
import type { ShareMetric, WorkoutShare } from '@/domain/workout-share';

export const shareTemplates = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'circular', label: 'Circular' },
  { id: 'typographic', label: 'Tipográfico' },
  { id: 'essential', label: 'Essencial' },
  { id: 'streak', label: 'Consistência' },
  { id: 'weekly', label: 'Progresso semanal' },
] as const;

export type ShareTemplate = (typeof shareTemplates)[number]['id'];
export type ShareFormat = 'compact' | 'story' | 'photo';
export type ShareOptions = {
  template: ShareTemplate;
  format: ShareFormat;
  tone: 'light' | 'dark';
  accent: boolean;
  title: boolean;
  metrics: ShareMetric['id'][];
  streak: boolean;
  weekly: boolean;
  size: number;
  x: number;
  y: number;
  photoFit: 'cover' | 'contain';
  photoX: number;
  photoY: number;
};

const story = { width: 1080, height: 1920 };
const stickerPadding = 16;
const lime = '#C9F078';
const display = '"Space Grotesk", sans-serif';
const inter = 'Inter, sans-serif';
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const flamePath =
  'M12 22a7 7 0 0 0 7-7c0-3.9-2-7-5-9-1 2-2 3-3 4 .5-3.4-.5-6-2-8-1 5-5 8-5 13a8 8 0 0 0 8 7Z';

export function loadShareFonts(text: string) {
  const sample = `MOVRA Duração Exercícios Consistência Progresso Semanal ${text}`;
  return Promise.all([
    document.fonts.load(`600 48px ${display}`, sample),
    document.fonts.load(`500 24px ${inter}`, sample),
  ]);
}

export function sharePresentation(data: WorkoutShare, options: ShareOptions) {
  const { template } = options;
  const title = (options.title && data.title) || data.modality;
  const metrics = data.metrics.filter((metric) => options.metrics.includes(metric.id));
  const evolution = template === 'streak' || template === 'weekly';
  const streak = evolution && options.streak ? data.habits?.streak : undefined;
  const week = evolution && options.weekly && data.habits?.target ? data.habits : undefined;
  const weekCount = week && `${week.weekly} de ${week.target}`;
  const streakLabel =
    streak === 1 ? 'treino programado em sequência' : 'treinos programados em sequência';
  const headline =
    template === 'typographic'
      ? 'Hoje teve treino.'
      : template === 'essential' || (evolution && streak === undefined && !week)
        ? 'Treino concluído'
        : title;
  const description = [
    headline,
    headline !== title && title,
    ...metrics.map(({ label, value }) => `${label}: ${value}`),
    streak !== undefined && `${streak} ${streakLabel}`,
    weekCount && `${weekCount} treinos programados nesta semana`,
    template === 'weekly' &&
      week &&
      week.days
        .map(
          ({ planned, done, activity }, i) =>
            `${weekdays[i]}: ${planned ? (done ? 'concluído' : 'programado') : activity ? 'atividade extra' : 'descanso'}`,
        )
        .join(', '),
    'MOVRA',
  ]
    .filter(Boolean)
    .join('. ');
  return { title, metrics, streak, week, weekCount, streakLabel, headline, description };
}

function drawPhoto(ctx: CanvasRenderingContext2D, photo: HTMLImageElement, options: ShareOptions) {
  const widthRatio = story.width / photo.naturalWidth;
  const heightRatio = story.height / photo.naturalHeight;
  const scale =
    options.photoFit === 'cover'
      ? Math.max(widthRatio, heightRatio)
      : Math.min(widthRatio, heightRatio);
  const width = photo.naturalWidth * scale;
  const height = photo.naturalHeight * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    photo,
    ((story.width - width) * options.photoX) / 100,
    ((story.height - height) * options.photoY) / 100,
    width,
    height,
  );
}

export function renderShareCanvas(
  canvas: HTMLCanvasElement,
  data: WorkoutShare,
  options: ShareOptions,
  photo?: HTMLImageElement,
) {
  const { metrics, title, headline, streak, week, weekCount, streakLabel } = sharePresentation(
    data,
    options,
  );
  const template = options.template;
  const sizes = {
    editorial: { width: 680, height: metrics.length ? 254 : 166 },
    circular: { width: 480, height: metrics.length > 1 ? 360 : 304 },
    typographic: { width: 680, height: metrics.length ? 310 : 270 },
    essential: { width: 680, height: metrics.length ? 193 : 155 },
    streak: { width: 680, height: 205 + (weekCount ? 40 : 0) + (metrics.length ? 48 : 0) },
    weekly: {
      width: 680,
      height: 175 + (week ? 79 : 0) + (streak !== undefined ? 35 : 0) + (metrics.length ? 45 : 0),
    },
  } as const;
  const { width, height } = sizes[template];
  const scale = options.size / 100;
  const compact = options.format === 'compact';
  canvas.width = compact ? Math.ceil((width + 2 * stickerPadding) * scale) : story.width;
  canvas.height = compact ? Math.ceil((height + 2 * stickerPadding) * scale) : story.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');
  const ctx = context;
  if (photo && options.format === 'photo') drawPhoto(ctx, photo, options);

  const x = compact
    ? stickerPadding * scale
    : 46 + ((story.width - width * scale - 92) * options.x) / 100;
  const y = compact
    ? stickerPadding * scale
    : 72 + ((story.height - height * scale - 144) * options.y) / 100;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ink = options.tone === 'light' ? '#FFFFFF' : '#172C29';
  const accent = options.accent ? lime : ink;
  if (options.format === 'photo') {
    ctx.shadowColor =
      options.tone === 'light' ? 'rgba(5, 19, 15, 0.65)' : 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetY = 1;
  }

  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    limit: number,
    {
      body = false,
      center = false,
      color = ink,
      fit = false,
    }: { body?: boolean; center?: boolean; color?: string; fit?: boolean } = {},
  ) {
    const font = body ? `500 ${size}px ${inter}` : `600 ${size}px ${display}`;
    ctx.font = font;
    ctx.textAlign = center ? 'center' : 'left';
    ctx.fillStyle = color;
    if (fit) {
      const measured = ctx.measureText(value).width;
      if (measured > limit) ctx.font = font.replace(`${size}px`, `${(size * limit) / measured}px`);
      ctx.fillText(value, x, y);
      return;
    }
    const chars = Array.from(value.normalize('NFC').slice(0, 240));
    let fitted = chars.join('');
    while (chars.length && ctx.measureText(fitted).width > limit) {
      chars.pop();
      fitted = `${chars.join('').trimEnd()}…`;
    }
    ctx.fillText(fitted, x, y);
  }

  function line(x1: number, y1: number, x2: number, y2: number, color = ink, weight = 2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = weight;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function brand(x: number, y: number) {
    ctx.save();
    ctx.translate(x, y - 16);
    ctx.scale(0.4, 0.4);
    ctx.lineWidth = 8;
    ctx.strokeStyle = ink;
    ctx.stroke(new Path2D(brandMarkPath));
    ctx.restore();
    text('MOVRA', x + 38, y, 23, 100);
    text('.', x + 122, y, 23, 9, { color: accent });
  }

  function columns(entries: ShareMetric[], x: number, y: number, available: number) {
    if (!entries.length) return;
    const cell = Math.min(available / entries.length, 210);
    entries.forEach(({ label, value }, index) => {
      const start = x + index * cell;
      if (index) line(start - 17, y - 14, start - 17, y + 39, accent);
      text(value, start, y, 37, cell - 30, { fit: true });
      text(label, start, y + 34, 20, cell - 30, { body: true });
    });
  }

  function metricLine(
    entries: ShareMetric[],
    x: number,
    y: number,
    available: number,
    center = false,
  ) {
    if (!entries.length) return;
    const inline = entries.map(({ id, value }) => {
      if (id === 'exercises') return `${value} ${value === '1' ? 'exercício' : 'exercícios'}`;
      if (id === 'sets') return `${value} ${value === '1' ? 'série' : 'séries'}`;
      return value;
    });
    text(inline.join(' · '), x, y, 23, available, { body: true, center, fit: true });
  }

  switch (template) {
    case 'editorial':
      line(23, 22, 23, height - 27, accent, 3);
      brand(45, 32);
      text(title, 48, 107, 57, width - 72);
      columns(metrics, 48, 179, width - 50);
      break;
    case 'circular': {
      const [primary, ...secondary] = metrics;
      const center = width / 2;
      ctx.beginPath();
      ctx.arc(center, 128, 104, Math.PI * 0.24, Math.PI * 1.81);
      ctx.lineWidth = 3;
      ctx.strokeStyle = accent;
      ctx.stroke();
      text(primary?.value ?? 'Treino', center, 115, 48, 187, { center: true, fit: true });
      text(primary?.label ?? 'Concluído', center, 160, 23, 175, { body: true, center: true });
      text(title, center, 247, 32, width - 26, { center: true });
      metricLine(secondary, center, 286, width - 26, true);
      brand(center - 67, height - 19);
      break;
    }
    case 'typographic':
      brand(19, 29);
      text('Hoje teve', 20, 105, 77, width - 40);
      text('treino.', 19, 176, 77, width - 40);
      line(262, 182, 321, 182, accent, 3);
      text(title, 23, 234, 27, width - 46, { body: true });
      metricLine(metrics, 23, 282, width - 46);
      break;
    case 'essential':
      ctx.beginPath();
      ctx.arc(45, 51, 21, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      line(36, 50, 43, 57, ink, 3);
      line(43, 57, 55, 44, ink, 3);
      text(headline, 83, 52, 47, 570);
      text(title, 84, 96, 25, 560, { body: true });
      metricLine(metrics, 84, 133, 560);
      brand(24, height - 21);
      break;
    case 'streak': {
      ctx.save();
      ctx.translate(25, 19);
      ctx.scale(2, 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.3;
      ctx.stroke(new Path2D(flamePath));
      ctx.restore();
      if (streak !== undefined) {
        text(String(streak), 86, 47, 68, 92);
        text(streakLabel, 25, 113, 28, width - 50);
      } else {
        text(weekCount ?? headline, 86, 46, 52, width - 108);
      }
      text(title, 25, 150, 23, width - 50, { body: true });
      if (weekCount)
        text(`Meta da semana · ${weekCount} treinos`, 25, 189, 23, width - 50, { body: true });
      metricLine(metrics, 25, weekCount ? 228 : 188, width - 50);
      brand(24, height - 22);
      break;
    }
    case 'weekly': {
      brand(25, 25);
      text(weekCount ? `${weekCount} treinos na semana` : headline, 26, 85, 47, width - 52);
      text(title, 26, 132, 24, width - 52, { body: true });
      if (week) {
        week.days.forEach(({ planned, done, activity }, index) => {
          const x = 44 + index * 72;
          ctx.beginPath();
          ctx.arc(x, 176, planned ? 11 : 4, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = ink;
          ctx.fillStyle = planned && done ? accent : ink;
          if (planned && !done) ctx.stroke();
          else {
            ctx.fill();
            if (planned && options.accent && options.tone === 'dark') ctx.stroke();
          }
          if (!planned && activity) line(x - 10, 188, x + 10, 188, accent);
          text(weekdays[index], x, 218, 19, 66, { body: true, center: true });
        });
      }
      if (streak !== undefined)
        text(`${streak} ${streakLabel}`, 26, week ? 251 : 172, 23, width - 52, { body: true });
      metricLine(metrics, 26, height - 27, width - 52);
      break;
    }
  }
}
