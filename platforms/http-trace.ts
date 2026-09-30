const MAX_ENTRIES = 8;
const BODY_PREVIEW_LIMIT = 600;

export interface HttpTraceEntry {
  time: string;
  method: string;
  url: string;
  status: number;
  bodyPreview: string;
}

const entries: HttpTraceEntry[] = [];

function formatTime(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function sanitizeUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw === "") return "(未知地址)";
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return raw.split("?")[0] || raw;
  }
}

function buildBodyPreview(data: unknown): string {
  if (typeof data === "string") {
    if (data.length <= BODY_PREVIEW_LIMIT) return data;
    return `${data.slice(0, BODY_PREVIEW_LIMIT)}…(共 ${data.length} 字符)`;
  }
  if (data == null) return String(data);
  if (data instanceof ArrayBuffer)
    return `<二进制响应 ${data.byteLength} 字节>`;
  if (ArrayBuffer.isView(data)) return `<二进制响应 ${data.byteLength} 字节>`;
  try {
    const text = JSON.stringify(data);
    if (typeof text !== "string") return Object.prototype.toString.call(data);
    if (text.length <= BODY_PREVIEW_LIMIT) return text;
    return `${text.slice(0, BODY_PREVIEW_LIMIT)}…(共 ${text.length} 字符)`;
  } catch {
    return Object.prototype.toString.call(data);
  }
}

export function mediaHttpTraceTransformResponse(
  this: { url?: unknown; method?: unknown },
  data: unknown,
  _headers?: unknown,
  status?: number,
): unknown {
  try {
    entries.push({
      time: formatTime(new Date()),
      method: String(this?.method ?? "GET").toUpperCase(),
      url: sanitizeUrl(this?.url),
      status: typeof status === "number" ? status : 0,
      bodyPreview: buildBodyPreview(data),
    });
    if (entries.length > MAX_ENTRIES)
      entries.splice(0, entries.length - MAX_ENTRIES);
  } catch {
    void 0;
  }

  if (typeof data === "string" && data.length > 0) {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

export function getRecentHttpTrace(limit = MAX_ENTRIES): HttpTraceEntry[] {
  return entries.slice(-limit);
}

export function clearHttpTrace(): void {
  entries.length = 0;
}

export function formatHttpTraceEntry(
  entry: HttpTraceEntry,
  bodyLimit = 600,
): string {
  const status = entry.status > 0 ? `HTTP ${entry.status}` : "HTTP ???";
  const raw =
    entry.bodyPreview.trim() === "" ? "(空响应体)" : entry.bodyPreview;
  const body = raw.replace(/\s+/g, " ");
  const preview =
    body.length > bodyLimit ? `${body.slice(0, bodyLimit)}…` : body;
  return `[${entry.time}] ${entry.method} ${entry.url} -> ${status} :: ${preview}`;
}
