/**
 * @deprecated
 * このクラスは旧V1構造（AsyncStorage由来の複雑なパス管理）向けです。
 * 新しいコードでは PathServiceV2 を使用してください。
 *
 * PathServiceV2では、expo-file-systemの階層的ディレクトリ構造を活用し、
 * 複雑な文字列操作を排除しています。
 *
 * 移行スケジュール:
 * - Phase 5: ドメインサービス層の更新
 * - Phase 6: ユースケース層・ハンドラー層の更新
 * - Phase 7: このファイルを完全削除
 *
 * @see PathServiceV2
 */
// パスユーティリティサービス（旧V1構造向け - 非推奨）
export class PathService {
  /**
   * パスを正規化（末尾にスラッシュを追加）
   * @deprecated PathServiceV2.normalizePath() を使用してください（動作が異なります）
   */
  static normalizePath(path: string): string {
    if (!path) return '/';
    if (path === '/') return '/';
    return path.endsWith('/') ? path : `${path}/`;
  }

  /**
   * フルパスを取得（親パス + 名前）
   * @deprecated V2では不要 - Directoryオブジェクトが自動的にパスを管理します
   */
  static getFullPath(parentPath: string, name: string, type: 'file' | 'folder'): string {
    const normalizedParent = this.normalizePath(parentPath); // Ensures parent ends with /
    const combined = normalizedParent === '/' ? `/${name}` : `${normalizedParent}${name}`;

    if (type === 'folder') {
      // If it's a folder, ensure it ends with a slash
      return combined.endsWith('/') ? combined : `${combined}/`;
    }
    // If it's a file, ensure it does NOT end with a slash (unless it's just "/")
    if (combined.endsWith('/') && combined.length > 1) {
      return combined.slice(0, -1);
    }
    return combined;
  }

  /**
   * 親パスを取得
   * @deprecated V2では不要 - Directory.parent プロパティで取得できます
   */
  static getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}/`;
  }

  /**
   * フォルダ名を取得
   * @deprecated V2では不要 - フォルダメタデータから直接name/slugを取得します
   */
  static getFolderName(path: string): string {
    const normalized = this.normalizePath(path);
    if (normalized === '/') return '/';
    const parts = normalized.slice(0, -1).split('/').filter(Boolean);
    return parts[parts.length - 1] || '/';
  }

  /**
   * 入力パスをパース（例: "aaa/bbb/file.txt" → {folders: ["aaa", "bbb"], fileName: "file.txt"}）
   * @deprecated V2では不要 - 上位レイヤーで直接処理するか、DirectoryResolverを使用します
   */
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
