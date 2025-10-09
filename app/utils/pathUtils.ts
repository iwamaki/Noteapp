// パスユーティリティ
export class PathUtils {
  static joinPath(basePath: string, ...segments: string[]): string {
    let result = basePath.replace(/\/+$/, ''); // 末尾のスラッシュを除去
    for (const segment of segments) {
      if (segment) {
        result += '/' + segment.replace(/^\/+/, ''); // 先頭のスラッシュを除去
      }
    }
    return result || '/';
  }
}
