export type RootStackParamList = {
  NoteList: undefined;
  NoteEdit: { noteId?: string };
  DiffView: { noteId: string; versionA: number; versionB: number };
  VersionHistory: { noteId: string };
  Settings: undefined;
};
