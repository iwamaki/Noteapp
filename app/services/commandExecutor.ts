// app/services/commandExecutor.ts
import { Note } from '@shared/types/note';
import { eventBus } from './eventBus';
import { NoteStorageService } from './storageService'; // Assuming NoteStorageService exists

interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
  redo?(): Promise<void>;
}

class UpdateNoteCommand implements Command {
  constructor(
    private noteId: string,
    private updates: Partial<Note>,
    private previousState?: Note
  ) {}

  async execute(): Promise<void> {
    const { id, ...restUpdates } = this.updates; // Destructure to omit 'id'
    const note = await NoteStorageService.updateNote({
      id: this.noteId,
      ...restUpdates // Spread the rest of the updates
    });
    await eventBus.emit('note:updated', { note });
  }

  async undo(): Promise<void> {
    if (this.previousState) {
      const { id, ...restPreviousState } = this.previousState; // Destructure to omit 'id'
      const note = await NoteStorageService.updateNote({
        id: this.noteId,
        ...restPreviousState // Spread the rest of the previous state
      });
      await eventBus.emit('note:updated', { note });
    }
  }
}

class CommandExecutor {
  private history: Command[] = [];
  private currentIndex = -1;

  async execute(command: Command): Promise<void> {
    await command.execute();
    
    // 新しいコマンドを実行したら、現在位置より後の履歴を削除
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  async undo(): Promise<void> {
    if (this.currentIndex >= 0 && this.history[this.currentIndex].undo) {
      await this.history[this.currentIndex].undo!();
      this.currentIndex--;
    }
  }

  async redo(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      await this.history[this.currentIndex].execute();
    }
  }
}

export const commandExecutor = new CommandExecutor();
