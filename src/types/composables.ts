import { type Ref, type ComputedRef } from 'vue';
import type { Note, Folder, Record, Reminder, Tag, CustomDatabase, Column } from './index';

// Хелпер для типизации catch блоков
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Неизвестная ошибка';
}

// Базовый интерфейс для async composables
export interface AsyncState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

// Return types для composables

export interface UseNotesReturn extends AsyncState {
  createNote: (title: string, parentId?: string | null) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => Promise<void>;
  deleteNote: (id: string, cascadeDelete?: boolean) => Promise<void>;
  getNoteById: (id: string) => Note | undefined;
  getRootNotes: () => ComputedRef<Note[]>;
  getChildren: (parentId: string) => ComputedRef<Note[]>;
  getAllDescendants: (noteId: string) => Note[];
  getChildrenCount: (noteId: string) => number;
  getNotePath: (noteId: string) => Promise<Note[]>;
  moveNote: (noteId: string, targetParentId: string | null) => Promise<void>;
  expandedNotes: Ref<Set<string>>;
  toggleNoteExpanded: (noteId: string) => void;
  expandNote: (noteId: string) => void;
  collapseNote: (noteId: string) => void;
  expandAllAncestors: (noteId: string) => void;
}

export interface UseFoldersReturn extends AsyncState {
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<string[]>;
  getFolderById: (id: string) => Folder | undefined;
  getChildFolders: (parentId: string | null) => ComputedRef<Folder[]>;
  getRootFolders: ComputedRef<Folder[]>;
}
