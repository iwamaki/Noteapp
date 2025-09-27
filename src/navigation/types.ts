export type RootStackParamList = {
  NoteList: undefined;
  NoteEdit: { noteId?: string; filename?: string; content?: string; saved?: boolean };
  DiffView: undefined;
  VersionHistory: { noteId: string };
  Settings: undefined;
};
