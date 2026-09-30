import util from "node:util";
import type { MiokuContext } from "mioku";
import type { MediaConfig } from "../types";
import type { ParsedMediaUrl } from "../platforms/types";
import {
  formatHttpTraceEntry,
  getRecentHttpTrace,
} from "../platforms/http-trace";

const INSPECT_OPTIONS: util.InspectOptions = {
  depth: 6,
  breakLength: 100,
  compact: false,
  colors: false,
  maxArrayLength: 30,
  maxStringLength: 1000,
  getters: false,
};

const MAX_STRING_LENGTH = 400;
const MAX_SUMMARY_LENGTH = 220;

function sanitizeString(text: string): string {
  let out = text;
  if (/^https?:\/\//i.test(out)) {
    try {
      const url = new URL(out);
      const count = [...url.searchParams.keys()].length;
      out = `${url.origin}${url.pathname}${count > 0 ? `?<${count} 个参数已省略>` : ""}`;
    } catch {
      void 0;
    }
  }
  return out.length > MAX_STRING_LENGTH
    ? `${out.slice(0, MAX_STRING_LENGTH)}…(共 ${out.length} 字符)`
    : out;
}

function sanitizeValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeString(value.message) };
  }
  if (depth >= 5) return "[层级过深已截断]";
  if (seen.has(value)) return "[循环引用]";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 20)
      .map((item) => sanitizeValue(item, depth + 1, seen));
    if (value.length > 20) items.push(`…(共 ${value.length} 项)`);
    return items;
  }

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = sanitizeValue(item, depth + 1, seen);
  }
  return out;
}

function describeOwnFields(error: object): string | null {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(error)) {
    if (
      key === "stack" ||
      key === "message" ||
      key === "name" ||
      key === "cause"
    )
      continue;
    extra[key] = (error as Record<string, unknown>)[key];
  }
  if (Object.keys(extra).length === 0) return null;
  return util.inspect(sanitizeValue(extra), INSPECT_OPTIONS);
}

function indent(text: string, prefix = "    "): string {
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function renderCauseChain(error: Error): string[] {
  const lines: string[] = [];
  let current: unknown = (error as { cause?: unknown }).cause;
  let level = 0;

  while (current !== undefined && current !== null && level < 5) {
    const label = level === 0 ? "cause" : `cause[${level}]`;
    if (current instanceof Error) {
      const own = describeOwnFields(current);
      lines.push(`  ${label}: ${current.name}: ${sanitizeString(current.message)}`);
      if (own) lines.push(indent(`附加字段: ${own}`));
      if (current.stack)
        lines.push(indent(`堆栈:\n${indent(current.stack, "  ")}`));
      current = (current as { cause?: unknown }).cause;
    } else {
      lines.push(
        `  ${label}: ${util.inspect(sanitizeValue(current), INSPECT_OPTIONS)}`,
      );
      break;
    }
    level += 1;
  }

  return lines;
}

function renderFullError(error: unknown): string {
  if (error instanceof Error) {
    const lines: string[] = [];
    lines.push(`  错误类型: ${error.name}`);
    lines.push(`  错误消息: ${sanitizeString(error.message) || "(空)"}`);

    const own = describeOwnFields(error);
    if (own) lines.push(`  附加字段: ${own}`);

    if (error.stack) lines.push(`  错误堆栈:\n${indent(error.stack)}`);

    const causeLines = renderCauseChain(error);
    if (causeLines.length > 0) {
      lines.push("  原始返回 (cause 链):");
      lines.push(...causeLines);
    }

    return lines.join("\n");
  }

  return `  (非 Error 抛出物) ${util.inspect(sanitizeValue(error), INSPECT_OPTIONS)}`;
}

function resolveErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const err = error as Record<string, any>;
  const candidates: unknown[] = [
    err.code,
    err.cause?.code,
    err.cause?.error?.code,
    err.cause?.error?.kind,
    err.cause?.error?.http?.status,
    err.cause?.error?.platform?.code,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && value !== 0) return String(value);
  }
  return undefined;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return sanitizeString(error.message);
  }
  if (typeof error === "string") {
    return sanitizeString(error);
  }
  try {
    return sanitizeString(JSON.stringify(error) ?? String(error));
  } catch {
    return sanitizeString(String(error));
  }
}

export async function handleMediaError(options: {
  ctx: MiokuContext;
  event: unknown;
  error: unknown;
  platform: string;
  config: MediaConfig;
  parsed?: ParsedMediaUrl;
  resolvedFrom?: string;
}): Promise<void> {
  const { ctx, error, platform, config, parsed, resolvedFrom } = options;

  let message = normalizeErrorMessage(error);
  if (message.length > MAX_SUMMARY_LENGTH) {
    message = `${message.slice(0, MAX_SUMMARY_LENGTH)}…`;
  }

  const code = resolveErrorCode(error);
  ctx.logger.error(
    `[media] ${platform} 解析失败${code ? ` [${code}]` : ""}: ${message}`,
  );

  const detail: string[] = [];
  detail.push(`平台: ${platform}${parsed ? ` (${parsed.platform})` : ""}`);

  if (parsed) {
    detail.push(
      `标识: ${parsed.id}${parsed.subtype ? ` (subtype=${parsed.subtype})` : ""}`,
    );
    if (parsed.extra && Object.keys(parsed.extra).length > 0) {
      detail.push(`附加参数: ${util.inspect(parsed.extra, INSPECT_OPTIONS)}`);
    }
  }
  if (resolvedFrom) {
    detail.push(`短链接: ${resolvedFrom} -> ${parsed?.id ?? "(未解析)"}`);
  }

  const cookieKey = parsed?.platform ?? "";
  if (
    cookieKey === "bilibili" ||
    cookieKey === "douyin" ||
    cookieKey === "kuaishou" ||
    cookieKey === "xiaohongshu"
  ) {
    const cookie = config.cookies?.[cookieKey] ?? "";
    detail.push(
      `Cookie: ${cookie.trim() ? `已配置 (${cookie.trim().length} 字符)` : "未配置"}`,
    );
  }

  detail.push("错误详情:");
  detail.push(renderFullError(error));

  const httpTrace = getRecentHttpTrace();
  if (httpTrace.length > 0) {
    detail.push(`本次解析发出的 HTTP 请求 (${httpTrace.length} 条):`);
    for (const entry of httpTrace) {
      detail.push(`  ${formatHttpTraceEntry(entry)}`);
    }
  } else {
    detail.push("本次解析发出的 HTTP 请求: (无记录，失败发生在发请求之前)");
  }

  ctx.logger.debug(
    `[media] ${platform} 解析失败详情:\n${detail.join("\n")}`,
  );
}
