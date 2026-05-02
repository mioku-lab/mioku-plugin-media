import type { ParsedMediaResult } from "../../types";
import type { ParsedMediaUrl } from "../types";

export interface PlatformResolver {
  resolve(client: any, parsed: ParsedMediaUrl): Promise<ParsedMediaResult>;
}
