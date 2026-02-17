export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  parentId?: string | null;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
  createdAt: number;
  updatedAt: number;
  isBlockFormat?: boolean;
}

export interface NoteWithChildren extends Note {
  children: NoteWithChildren[];
}

export interface NotePath {
  note: Note;
  ancestors: Note[];
}

export interface AppState {
  folders: Folder[];
  notes: Note[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  searchQuery: string;
}

// Custom Database types
export type ColumnType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'FILE';

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

export interface Column {
  id: string;
  databaseId: string;
  name: string;
  type: ColumnType;
  options?: SelectOption[];
  position: number;
  createdAt: number;
}

export interface CustomDatabase {
  id: string;
  name: string;
  folderId: string | null;
  columns: Column[];
  createdAt: number;
  updatedAt: number;
}

export interface Record {
  id: string;
  databaseId: string;
  data: { [columnId: string]: any };
  createdAt: number;
  updatedAt: number;
}

export interface FileAttachment {
  id: string;
  recordId: string;
  columnId: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
