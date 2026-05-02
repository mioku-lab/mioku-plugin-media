import type { MediaRuntimeState } from "./types";
import {
  getPluginRuntimeState,
  resetPluginRuntimeState,
  setPluginRuntimeState,
} from "../../src";

const PLUGIN_NAME = "media";

export function setMediaRuntimeState(
  nextState: Partial<MediaRuntimeState>,
): MediaRuntimeState {
  return setPluginRuntimeState<MediaRuntimeState>(PLUGIN_NAME, nextState);
}

export function getMediaRuntimeState(): MediaRuntimeState {
  return getPluginRuntimeState<MediaRuntimeState>(PLUGIN_NAME);
}

export function resetMediaRuntimeState(): void {
  resetPluginRuntimeState(PLUGIN_NAME);
}
