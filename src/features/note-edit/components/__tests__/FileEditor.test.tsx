import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FileEditor } from '../FileEditor';

describe('FileEditor', () => {
  it('renders markdown content correctly in preview mode', () => {
    const markdownContent = '# Hello Markdown\n\nThis is a **test** paragraph.';
    render(
      <FileEditor
        filename="test.md"
        initialContent={markdownContent}
        mode="preview"
        onModeChange={jest.fn()}
        onContentChange={jest.fn()}
      />
    );

    // Markdownが正しくレンダリングされていることを確認
    // react-native-markdown-displayは通常、Textコンポーネントに変換するため、
    // テキストコンテンツが存在するかどうかで確認します。
    expect(screen.getByText('Hello Markdown')).toBeTruthy();
    expect(screen.getByText('This is a test paragraph.')).toBeTruthy();
    // より詳細な要素の確認は、react-native-markdown-displayの内部実装に依存するため、
    // ここでは表示されるテキストコンテンツの存在を確認するに留めます。
  });

  it('renders plain text content correctly in content mode', () => {
    const plainContent = 'This is plain text.';
    render(
      <FileEditor
        filename="test.txt"
        initialContent={plainContent}
        mode="content"
        onModeChange={jest.fn()}
        onContentChange={jest.fn()}
      />
    );

    expect(screen.getByText('This is plain text.')).toBeTruthy();
  });

  it('renders editable text input in edit mode', () => {
    const initialContent = 'Editable content';
    render(
      <FileEditor
        filename="test.txt"
        initialContent={initialContent}
        mode="edit"
        onModeChange={jest.fn()}
        onContentChange={jest.fn()}
      />
    );

    const textInput = screen.getByDisplayValue(initialContent);
    expect(textInput).toBeTruthy();
    expect(textInput.props.multiline).toBe(true);
  });
});
