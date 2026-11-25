import {
  DEVICE_MEDIA_LIMIT,
  THREAD_MEDIA_LIMIT,
  inspectMedia,
  messageText,
  type ChatMessage,
} from '@/domain/messaging';
import { connectService } from './connect-service';
import { linkAllows } from './marketplace-service';

const DB = 'movra:conversas:1';
const MESSAGES = 'messages';
const FILES = 'files';
type FileRecord = { id: string; thread: string; size: number; data: Blob };
let opening: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(Error('As conversas precisam do armazenamento IndexedDB deste navegador.'));
        return;
      }
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        const messages = request.result.createObjectStore(MESSAGES, { keyPath: 'id' });
        messages.createIndex('thread', 'thread');
        messages.createIndex('recipient', 'recipient');
        messages.createIndex('expiry', 'attachment.expiresAt');
        const files = request.result.createObjectStore(FILES, { keyPath: 'id' });
        files.createIndex('budget', ['thread', 'size']);
      };
      request.onerror = () =>
        reject(Error('Não foi possível abrir o armazenamento local das conversas.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      opening = undefined;
      throw error;
    });
  }
  return opening;
}
function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(
  stores: string[],
  mode: IDBTransactionMode,
  task: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const transaction = (await openDatabase()).transaction(stores, mode);
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? Error('Gravação local interrompida.'));
  });
  try {
    const value = await task(transaction);
    await done;
    return value;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      /* transaction already closed */
    }
    await done.catch(() => undefined);
    if (error instanceof DOMException && error.name === 'QuotaExceededError')
      throw Error('O navegador ficou sem espaço. Reduza o tamanho do anexo e tente novamente.');
    throw error;
  }
}

let revision = 0;
let channel: BroadcastChannel | undefined;
const listeners = new Set<() => void>();
function changed() {
  revision++;
  listeners.forEach((listener) => listener());
}
function notify() {
  changed();
  channel?.postMessage('changed');
}
function subscribe(listener: () => void) {
  if (!listeners.size && typeof window !== 'undefined') {
    window.addEventListener('focus', changed);
    try {
      channel = new BroadcastChannel(DB);
      channel.onmessage = changed;
    } catch {
      /* Refresh on focus in browsers without cross-tab broadcasts. */
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener('focus', changed);
    channel?.close();
    channel = undefined;
  };
}
function access(actor: string, thread: string, sending = false) {
  const link = connectService.professionalLinks(actor).find((entry) => entry.id === thread);
  if (!link || !connectService.isActive(actor))
    throw Error('Abra uma conversa da sua própria conta.');
  if (
    sending &&
    (link.endedAt !== null || !linkAllows(link.trainerId, link.studentId, 'chat', link.startedAt))
  )
    throw Error('O acompanhamento atual permite somente consultar o histórico desta conversa.');
  return link;
}

async function sweep(now = Date.now()) {
  const sweepResult = await transact([MESSAGES, FILES], 'readwrite', async (tx) => {
    const messages = tx.objectStore(MESSAGES);
    const expiry = messages.index('expiry');
    const expired: ChatMessage[] = await result(expiry.getAll(IDBKeyRange.upperBound(now)));
    for (const message of expired) {
      tx.objectStore(FILES).delete(message.id);
      // We keep the message and caption. There are no generated thumbnails.
      messages.put({ ...message, attachment: { kind: 'video', size: 0, name: '', expired: true } });
    }
    const first = await result(expiry.openKeyCursor());
    return { removed: expired.length, next: first ? Number(first.key) : undefined };
  });
  if (sweepResult.removed) notify();
  return sweepResult.next;
}

// Local retention runs while MOVRA is open and catches up at the next launch.
export function startConversationRetention() {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request = 0;
  function schedule() {
    const token = ++request;
    void sweep()
      .then((next) => {
        if (!active || token !== request) return;
        clearTimeout(timer);
        if (next !== undefined) timer = setTimeout(schedule, Math.max(1, next - Date.now()));
      })
      .catch(() => {
        /* Chat surfaces storage errors when opened. */
      });
  }
  schedule();
  const unsubscribe = subscribe(schedule);
  return () => {
    active = false;
    clearTimeout(timer);
    unsubscribe();
  };
}

async function messages(actor: string, thread: string) {
  access(actor, thread);
  await sweep();
  const items: ChatMessage[] = await transact([MESSAGES], 'readonly', (tx) =>
    result(tx.objectStore(MESSAGES).index('thread').getAll(thread)),
  );
  access(actor, thread);
  return items.sort(
    (a, b) =>
      a.createdAt - b.createdAt || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id),
  );
}
async function unread(actor: string) {
  if (!connectService.isActive(actor)) return {};
  const records: ChatMessage[] = await transact([MESSAGES], 'readonly', (tx) =>
    result(tx.objectStore(MESSAGES).index('recipient').getAll(actor)),
  );
  const allowed = new Set(connectService.professionalLinks(actor).map((link) => link.id));
  const counts: Record<string, number> = {};
  for (const message of records) {
    if (message.readAt === undefined && allowed.has(message.thread))
      counts[message.thread] = (counts[message.thread] ?? 0) + 1;
  }
  return counts;
}
async function markRead(actor: string, thread: string) {
  access(actor, thread);
  const count = await transact([MESSAGES], 'readwrite', async (tx) => {
    const store = tx.objectStore(MESSAGES);
    const records: ChatMessage[] = await result(store.index('thread').getAll(thread));
    access(actor, thread);
    const items = records.filter(
      (record) => record.recipient === actor && record.readAt === undefined,
    );
    for (const item of items) store.put({ ...item, readAt: Date.now() });
    return items.length;
  });
  if (count) notify();
}

async function send(actor: string, thread: string, input: string, file?: File) {
  access(actor, thread, true);
  const text = messageText(input, !!file);
  const attachment = file && (await inspectMedia(file, Date.now()));
  if (attachment) await sweep();
  await transact([MESSAGES, FILES], 'readwrite', async (tx) => {
    const files = tx.objectStore(FILES);
    if (attachment) {
      // The index exposes byte counts without instantiating stored blobs.
      const keys = await result(files.index('budget').openKeyCursor());
      let device = 0,
        conversation = 0;
      await new Promise<void>((resolve, reject) => {
        function walk(cursor: IDBCursor | null) {
          if (!cursor) return resolve();
          const [owner, size] = cursor.key as [string, number];
          device += size;
          if (owner === thread) conversation += size;
          cursor.request.onsuccess = () => walk(cursor.request.result);
          cursor.request.onerror = () => reject(cursor.request.error);
          cursor.continue();
        }
        walk(keys);
      });
      if (
        device + attachment.size > DEVICE_MEDIA_LIMIT ||
        conversation + attachment.size > THREAD_MEDIA_LIMIT
      )
        throw Error(
          'Limite de anexos atingido (40 MB por conversa e 80 MB neste navegador). Envie uma mensagem de texto.',
        );
    }
    const messages = tx.objectStore(MESSAGES);
    const order = await result(messages.index('thread').count(thread));
    const link = access(actor, thread, true);
    const id = crypto.randomUUID();
    const message: ChatMessage = {
      id,
      thread,
      sender: actor,
      recipient: actor === link.studentId ? link.trainerId : link.studentId,
      text,
      order,
      createdAt: Date.now(),
      ...(attachment ? { attachment } : {}),
    };
    messages.add(message);
    if (file && attachment)
      files.add({ id, thread, size: attachment.size, data: file } satisfies FileRecord);
  });
  notify();
}
async function media(actor: string, thread: string, id: string) {
  access(actor, thread);
  const { blob, until } = await transact([MESSAGES, FILES], 'readonly', async (tx) => {
    const message: ChatMessage | undefined = await result(tx.objectStore(MESSAGES).get(id));
    if (message?.thread !== thread || !message.attachment) throw Error('Anexo indisponível.');
    const until = message.attachment.expiresAt;
    if (message.attachment.expired || (until !== undefined && until <= Date.now()))
      throw Error('Vídeo expirado');
    const file: FileRecord | undefined = await result(tx.objectStore(FILES).get(id));
    if (!file || file.thread !== thread) throw Error('Arquivo indisponível neste navegador.');
    return { blob: file.data, until };
  });
  access(actor, thread);
  if (until !== undefined && until <= Date.now()) throw Error('Vídeo expirado');
  return blob;
}
export const messagingService = {
  messages,
  unread,
  markRead,
  send,
  media,
  subscribe,
  revision: () => revision,
};
