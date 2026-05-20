import type { MiokiContext } from "mioki";
import type { MediaConfig } from "../types";

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function handleMediaError(options: {
  ctx: MiokiContext;
  event: any;
  error: unknown;
  platform: string;
  config: MediaConfig;
}): Promise<void> {
  const { ctx, error, platform } = options;
  const errorMessage = normalizeErrorMessage(error);
  ctx.logger.error(`[media] ${platform} 解析失败: ${errorMessage}`, error);
}
