export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  parentId?: string | null;
  icon?: string | null;
  backdropType?: string | null;
  backdropValue?: string | null;
  backdropPositionY?: number;
  color?: string | null;
  createdAt: number;
  updatedAt: number;
  isBlockFormat?: boolean;
  tags?: Tag[];
  isFavorite?: boolean;
  shareToken?: string | null;
}

export interface NoteWithChildren extends Note {
  children: NoteWithChildren[];
}

export interface NotePath {
  note: Note;
  ancestors: Note[];
}

export interface AppState {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
}

// УСТАРЕЛО: Интерфейс Folder больше не используется
// Папки теперь реализованы как страницы (Note с пустым content)
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// Custom Database types
export type ColumnType =
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'FILE'
  | 'RELATION'
  | 'FORMULA'
  | 'PERSON'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'CREATED_TIME'
  | 'LAST_EDITED_TIME';

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

export interface FormulaConfig {
  expression: string; // e.g., "col1 + col2", "col1 * col2"
  referencedColumns: string[]; // column IDs used in the formula
}

export interface Column {
  id: string;
  databaseId: string;
  name: string;
  type: ColumnType;
  options?: SelectOption[]; // For SELECT and MULTI_SELECT types
  formula?: FormulaConfig; // For FORMULA type
  position: number;
  createdAt: number;
}

export interface CustomDatabase {
  id: string;
  name: string;
  folderId: string | null;
  columns: Column[];
  views?: import('./database').DatabaseView[];
  createdAt: number;
  updatedAt: number;
}

export interface Record {
  id: string;
  databaseId: string;
  data: RecordData;
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

// File cell value structure - массив файлов в ячейке FILE
export interface FileCellValue {
  id: string;
  fileId: string; // ID файла на сервере
  filename: string;
  url?: string; // URL для доступа к файлу
  contentType: string;
  size: number;
  key: string; // key для удаления через API
}

// Структура данных для FILE колонки
export interface FileValue {
  files: FileCellValue[];
}

// Типизированные значения ячеек базы данных
export type CellValue =
  | string
  | number
  | boolean
  | Date
  | string[]           // для MULTI_SELECT
  | FileCellValue[]    // для FILE
  | null
  | undefined;

// Типизированные данные записи (вместо { [columnId: string]: any })
export type RecordData = { [columnId: string]: CellValue };

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

// Quick Capture types
export type CaptureType = 'text' | 'voice' | 'photo';

export interface CapturedItem {
  id: string;
  type: CaptureType;
  content: string;
  imageData?: string; // Base64 для фото
  createdAt: number;
}

export interface RelatedNote {
  note: Note;
  similarity: number; // 0-1, мера семантического сходства
  reason?: string; // Объяснение, почему заметка релевантна
}

// Search types
export interface SearchMatch {
  text: string;           // Текст сниппета (~100 символов)
  highlightStart: number; // Начало подсветки
  highlightEnd: number;   // Конец подсветки
  matchType: 'title' | 'content';
}

export interface SearchResult {
  note: Note;
  score: number;
  snippet: SearchMatch | null;
  matchedIn: 'title' | 'content' | 'both';
}
