export type RootStackParamList = {
  NoteList: undefined;
  NoteEdit: { noteId?: string; filename?: string; content?: string; saved?: boolean };
  DiffView: {
    noteId?: string;
    versionId?: string;
    originalContent?: string;
    newContent?: string;
    mode?: 'restore' | 'save';
  } | undefined;
  VersionHistory: { noteId: string };
  Settings: undefined;
};