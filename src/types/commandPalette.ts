export interface CommandPaletteItem {
  id: string;
  type: 'note' | 'command' | 'search-result';
  title: string;
  description?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export interface CommandPaletteSection {
  id: string;
  title: string;
  items: CommandPaletteItem[];
}
