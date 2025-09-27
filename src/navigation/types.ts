export type RootStackParamList = {
  NoteList: undefined;
  NoteEdit: { noteId?: string; filename?: string; content?: string; saved?: boolean };
  DiffView: { originalContent: string; newContent: string; filename: string };
  VersionHistory: { noteId: string };
  Settings: undefined;
};
