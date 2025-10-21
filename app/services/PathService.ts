
// パスユーティリティサービス
export class PathService {
  // パスを正規化（末尾にスラッシュを追加）
  static normalizePath(path: string): string {
    if (!path) return '/';
    if (path === '/') return '/';
    return path.endsWith('/') ? path : `${path}/`;
  }

  // フルパスを取得（親パス + 名前）
  static getFullPath(parentPath: string, name: string, type: 'note' | 'folder'): string {
    const normalizedParent = this.normalizePath(parentPath); // Ensures parent ends with /
    const combined = normalizedParent === '/' ? `/${name}` : `${normalizedParent}${name}`;

    if (type === 'folder') {
      // If it's a folder, ensure it ends with a slash
      return combined.endsWith('/') ? combined : `${combined}/`;
    }
    // If it's a note, ensure it does NOT end with a slash (unless it's just "/")
    if (combined.endsWith('/') && combined.length > 1) {
      return combined.slice(0, -1);
    }
    return combined;
  }

  // 親パスを取得
  static getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}/`;
  }

  // フォルダ名を取得
  static getFolderName(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    return parts[parts.length - 1] || '/';
  }

  // 入力パスをパース（例: "aaa/bbb/note.txt" → {folders: ["aaa", "bbb"], fileName: "note.txt"}）
  static parseInputPath(input: string): { folders: string[]; fileName: string } {
    const trimmed = input.trim();
    const parts = trimmed.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { folders: [], fileName: '新しいノート' };
    }

    if (parts.length === 1) {
      return { folders: [], fileName: parts[0] };
    }

    return {
      folders: parts.slice(0, -1),
      fileName: parts[parts.length - 1],
    };
  }
}
