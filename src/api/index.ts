export { apiClient, ApiError } from './client';
export { foldersApi } from './folders';
export { notesApi } from './notes';
export { databasesApi } from './databases';
export { filesApi } from './files';
export { tagsApi } from './tags';

export type {
  CreateFolderRequest,
  UpdateFolderRequest,
} from './folders';

export type {
  CreateNoteRequest,
  UpdateNoteRequest,
} from './notes';

export type {
  CreateDatabaseRequest,
  UpdateDatabaseRequest,
  CreateColumnRequest,
  UpdateColumnRequest,
  CreateRecordRequest,
  UpdateRecordRequest,
} from './databases';

export type {
  UploadFileResponse,
  GetFileUrlResponse,
} from './files';

export type {
  CreateTagRequest,
  UpdateTagRequest,
  SetNoteTagsRequest,
} from './tags';
