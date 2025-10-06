import { eventBus } from '../eventBus';
import { commandExecutor } from '../commandExecutor';
import { Note } from '../../../shared/types/note';
import { NoteStorageService } from '../storageService'; // Mock this service

// Mock NoteStorageService as it's a dependency for UpdateNoteCommand
jest.mock('../storageService', () => ({
  NoteStorageService: {
    updateNote: jest.fn((note: Note) => Promise.resolve(note)),
    createNote: jest.fn((data: Partial<Note>) => Promise.resolve({ id: 'new-id', ...data, createdAt: new Date(), updatedAt: new Date(), version: 1 })),
    deleteNote: jest.fn((noteId: string) => Promise.resolve()),
    copyNotes: jest.fn((ids: string[]) => Promise.resolve(ids.map(id => ({ id: `copy-${id}`, title: 'copied', content: 'copied', createdAt: new Date(), updatedAt: new Date(), version: 1 }))))
  },
}));

// Mock UpdateNoteCommand for CommandExecutor tests
class MockUpdateNoteCommand implements Command {
  constructor(
    public noteId: string,
    public updates: Partial<Note>,
    public previousState?: Note
  ) {}

  async execute(): Promise<void> {
    // Simulate update
    console.log(`Executing update for note ${this.noteId} with ${JSON.stringify(this.updates)}`);
    await eventBus.emit('note:updated', { note: { id: this.noteId, ...this.updates, createdAt: new Date(), updatedAt: new Date(), version: 1 } as Note });
  }

  async undo(): Promise<void> {
    if (this.previousState) {
      console.log(`Undoing update for note ${this.noteId} to ${JSON.stringify(this.previousState)}`);
      await eventBus.emit('note:updated', { note: this.previousState });
    }
  }

  async redo(): Promise<void> {
    // For simplicity, redo just re-executes the original command's effect
    await this.execute();
  }
}

interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
  redo?(): Promise<void>;
}


describe('EventBus', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all listeners before each test to ensure isolation
    (eventBus as any).listeners.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should register and emit events to listeners', async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const mockNote: Note = { id: '1', title: 'Test', content: 'Content', createdAt: new Date(), updatedAt: new Date(), version: 1 };

    eventBus.on('note:created', handler1);
    eventBus.on('note:created', handler2);

    await eventBus.emit('note:created', { note: mockNote });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith({ note: mockNote });
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith({ note: mockNote });
  });

  it('should return a cleanup function that removes the listener', async () => {
    const handler = jest.fn();
    const mockNote: Note = { id: '1', title: 'Test', content: 'Content', createdAt: new Date(), updatedAt: new Date(), version: 1 };

    const cleanup = eventBus.on('note:created', handler);
    cleanup(); // Remove the listener

    await eventBus.emit('note:created', { note: mockNote });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle errors in listeners and emit an error:occurred event', async () => {
    const errorHandler = jest.fn();
    const failingHandler = jest.fn(() => { throw new Error('Test error'); });
    const mockNote: Note = { id: '1', title: 'Test', content: 'Content', createdAt: new Date(), updatedAt: new Date(), version: 1 };

    eventBus.on('note:created', failingHandler);
    eventBus.on('error:occurred', errorHandler);

    await eventBus.emit('note:created', { note: mockNote });

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ 
      error: expect.any(Error),
      context: 'note:created',
    }));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Event handler error for note:created:', expect.any(Error));
  });

  it('should not emit error:occurred recursively for error:occurred events', async () => {
    const errorHandler = jest.fn(() => { throw new Error('Error in error handler'); });
    const failingHandler = jest.fn(() => { throw new Error('Test error'); });
    const mockNote: Note = { id: '1', title: 'Test', content: 'Content', createdAt: new Date(), updatedAt: new Date(), version: 1 };

    eventBus.on('note:created', failingHandler);
    eventBus.on('error:occurred', errorHandler);

    await eventBus.emit('note:created', { note: mockNote });

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(1); // Should only be called once for the initial error
    // console.error should be called for the error in the error handler, but no new error:occurred event
    expect(consoleErrorSpy).toHaveBeenCalledWith('Event handler error for error:occurred:', expect.any(Error));
  });
});

describe('CommandExecutor', () => {
  let noteUpdatedHandler: jest.Mock;
  const mockNote: Note = { id: 'note-1', title: 'Original', content: 'Original content', createdAt: new Date(), updatedAt: new Date(), version: 1 };
  const updatedNote: Note = { ...mockNote, content: 'Updated content', updatedAt: new Date() };
  const anotherUpdate: Note = { ...mockNote, content: 'Another update', updatedAt: new Date() };

  beforeEach(() => {
    noteUpdatedHandler = jest.fn();
    eventBus.on('note:updated', noteUpdatedHandler);
    // Reset commandExecutor state
    (commandExecutor as any).history = [];
    (commandExecutor as any).currentIndex = -1;
  });

  afterEach(() => {
    (eventBus as any).listeners.clear();
  });

  it('should execute a command and add it to history', async () => {
    const command = new MockUpdateNoteCommand(mockNote.id, { content: 'First update' }, mockNote);
    await commandExecutor.execute(command);

    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: expect.objectContaining({ content: 'First update' })
    }));
    expect((commandExecutor as any).history.length).toBe(1);
    expect((commandExecutor as any).currentIndex).toBe(0);
  });

  it('should undo the last executed command', async () => {
    const command1 = new MockUpdateNoteCommand(mockNote.id, { content: 'First update' }, mockNote);
    await commandExecutor.execute(command1);
    noteUpdatedHandler.mockClear(); // Clear calls from execute

    await commandExecutor.undo();

    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: mockNote // Should revert to original content
    }));
    expect((commandExecutor as any).currentIndex).toBe(-1);
  });

  it('should redo a previously undone command', async () => {
    const command1 = new MockUpdateNoteCommand(mockNote.id, { content: 'First update' }, mockNote);
    await commandExecutor.execute(command1);
    await commandExecutor.undo();
    noteUpdatedHandler.mockClear(); // Clear calls from undo

    await commandExecutor.redo();

    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: expect.objectContaining({ content: 'First update' })
    }));
    expect((commandExecutor as any).currentIndex).toBe(0);
  });

  it('should clear future history when a new command is executed after undo', async () => {
    const initialState: Note = { id: 'note-1', title: 'Original', content: 'Original content', createdAt: new Date(), updatedAt: new Date(), version: 1 };
    const stateAfterCmd1: Note = { ...initialState, content: 'First update' };
    const stateAfterCmd2: Note = { ...initialState, content: 'Second update' };
    const stateAfterCmd3: Note = { ...initialState, content: 'Third update' };

    const command1 = new MockUpdateNoteCommand(initialState.id, { content: 'First update' }, initialState);
    await commandExecutor.execute(command1); // History: [cmd1]. Emits stateAfterCmd1.
    noteUpdatedHandler.mockClear(); // Clear calls from cmd1 execution

    const command2 = new MockUpdateNoteCommand(initialState.id, { content: 'Second update' }, stateAfterCmd1);
    await commandExecutor.execute(command2); // History: [cmd1, cmd2]. Emits stateAfterCmd2.
    noteUpdatedHandler.mockClear(); // Clear calls from cmd2 execution

    await commandExecutor.undo(); // Undoes command2. Emits stateAfterCmd1.
    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: expect.objectContaining({ content: 'First update' })
    }));
    noteUpdatedHandler.mockClear(); // Clear calls from undo cmd2

    const command3 = new MockUpdateNoteCommand(initialState.id, { content: 'Third update' }, stateAfterCmd1); // previousState should be stateAfterCmd1
    await commandExecutor.execute(command3); // History: [cmd1, cmd3]. Emits stateAfterCmd3.
    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: expect.objectContaining({ content: 'Third update' })
    }));
    noteUpdatedHandler.mockClear(); // Clear calls from cmd3 execution

    await commandExecutor.undo(); // Should undo command3. Emits stateAfterCmd1.
    expect(noteUpdatedHandler).toHaveBeenCalledTimes(1);
    expect(noteUpdatedHandler).toHaveBeenCalledWith(expect.objectContaining({
      note: expect.objectContaining({ content: 'First update' }) // Reverts to state after cmd1
    }));
    expect((commandExecutor as any).history.length).toBe(2);
    expect((commandExecutor as any).history[1]).toBe(command3);
    expect((commandExecutor as any).currentIndex).toBe(0); // After undoing command3, currentIndex should be 0 (pointing to cmd1)
  });
});
