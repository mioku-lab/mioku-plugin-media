import type { MediaRuntimeState } from "./types";
import {
  getPluginRuntimeState,
  resetPluginRuntimeState,
  setPluginRuntimeState,
} from "mioku";

const PLUGIN_NAME = "media";

export function setMediaRuntimeState(
  nextState: Partial<MediaRuntimeState>,
): MediaRuntimeState {
  return setPluginRuntimeState(PLUGIN_NAME, nextState) as MediaRuntimeState;
}

export function getMediaRuntimeState(): MediaRuntimeState {
  return getPluginRuntimeState(PLUGIN_NAME) as MediaRuntimeState;
}

export function resetMediaRuntimeState(): void {
  resetPluginRuntimeState(PLUGIN_NAME);
}
