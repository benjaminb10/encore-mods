export type Paste = { id: number; text: string; lines: number }

declare module 'claude-code' {
  interface PluginState {
    'paste-peek': { pastes: Paste[]; box: string; viewing: number | null }
  }
}
