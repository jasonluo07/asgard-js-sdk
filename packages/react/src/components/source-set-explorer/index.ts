// F-025 — the SourceSet File Explorer's public surface.
//
// Only the component and its props types leave this module. The tree, the state machine, the dialog and
// the copied leaf UI stay internal: F-025 specifies one closed component that hosts configure by props,
// not a construction kit, and every symbol exported here is one this package has to keep working.

export { SourceSetFileExplorer } from './source-set-file-explorer';
export type { SourceSetFileExplorerProps, SourceSetExplorerTheme } from './source-set-file-explorer';
