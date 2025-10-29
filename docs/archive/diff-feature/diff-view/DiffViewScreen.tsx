/**
 * @file DiffViewScreen.tsx
 * @summary このファイルは、アプリケーションの差分表示画面をレンダリングします。
 * @responsibility ファイルの変更履歴やドラフト内容の差分を表示し、選択した変更を適用またはバージョンを復元する機能を提供します。
 */
import React from 'react';
import { DiffViewer } from './components/DiffViewer';
import { useDiffView } from './hooks/useDiffView';
import { MainContainer } from '../../components/MainContainer';

function DiffViewScreen() {
  const { diff } = useDiffView();

  return (
    <MainContainer>
      <DiffViewer
        diff={diff}
      />
    </MainContainer>
  );
}

export default DiffViewScreen;