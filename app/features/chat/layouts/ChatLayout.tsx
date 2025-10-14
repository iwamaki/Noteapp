/**
 * @file ChatLayout.tsx
 * @summary ChatInputBarのレイアウトを管理するコンテナコンポーネント
 * @description このコンポーネントは、ChatInputBarを画面下部に配置します。
 *
 * @responsibility
 * - ChatInputBarの表示
 */

import React from 'react';
import { ChatInputBar } from '../components/ChatInputBar';

interface ChatLayoutProps {
  /** ChatInputBarを表示するかどうか */
  visible: boolean;
}

/**
 * ChatInputBarを表示するコンポーネント
 */
export function ChatLayout({ visible }: ChatLayoutProps) {
  if (!visible) {
    return null;
  }

  return <ChatInputBar />;
}
