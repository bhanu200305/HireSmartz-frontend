import { useState, useEffect, useCallback } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import {
  EditorState,
  convertToRaw,
  convertFromRaw,
  Modifier,
  convertFromHTML,
  ContentBlock,
} from 'draft-js';
import Immutable from 'immutable';
import draftToHtml from 'draftjs-to-html';
import 'draft-js/dist/Draft.css';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { markdownToDraft } from 'markdown-draft-js';
import './RichTextEditor.css';

/**
 * Cleans pasted HTML so bullet lists align properly (no extra whitespace/empty blocks).
 */
function cleanPastedHtml(html: string): string {
  if (!html || !html.trim()) return html;
  let out = html
    .replace(/\r\n/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ');
  // Remove empty paragraphs and divs (often pasted between list items)
  out = out.replace(/<p[^>]*>\s*<\/p>/gi, '');
  out = out.replace(/<div[^>]*>\s*<\/div>/gi, '');
  out = out.replace(/<p[^>]*>(\s|&nbsp;)*<\/p>/gi, '');
  // Remove empty paragraphs between list items so bullets stay aligned
  out = out.replace(/(<\/li>)\s*<p[^>]*>\s*<\/p>\s*(<li)/gi, '$1$2');
  out = out.replace(/(<\/li>)\s*<p[^>]*>(\s|&nbsp;)*<\/p>\s*(<li)/gi, '$1$2');
  out = out.replace(/(<\/li>)\s*<div[^>]*>\s*<\/div>\s*(<li)/gi, '$1$2');
  // Collapse multiple <br> between list items
  out = out.replace(/(<\/li>)\s*(<br\s*\/?>)\s*(<br\s*\/?>)+(\s*)(<li)/gi, '$1$5');
  out = out.replace(/(<\/li>)\s*(<br\s*\/?>)\s*(<br\s*\/?>)+/gi, '$1');
  // Trim leading/trailing whitespace inside list items
  out = out.replace(/<li>(\s+)/gi, '<li>');
  out = out.replace(/(\s+)<\/li>/gi, '</li>');
  return out.trim();
}

/**
 * Cleans pasted plain text so bullet lines don't get extra blank lines.
 */
function cleanPastedText(text: string): string {
  if (!text || !text.trim()) return text;
  const lines = text.split(/\r\n|\r|\n/).map((line) => line.trimEnd());
  const result: string[] = [];
  let prevWasBlank = false;
  let prevWasListItem = false;
  const bulletStart = /^[\s]*[-*•]\s|^\d+\.\s/;
  for (const line of lines) {
    const isBlank = line.trim() === '';
    const isListItem = bulletStart.test(line.trim());
    if (isBlank) {
      if (!prevWasBlank && !prevWasListItem) result.push('');
      prevWasBlank = true;
      prevWasListItem = false;
    } else {
      if (prevWasBlank && isListItem && result.length > 0) result.pop();
      result.push(line);
      prevWasBlank = false;
      prevWasListItem = isListItem;
    }
  }
  return result
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface RichTextEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  /** When using sticky toolbar below another sticky header, e.g. "top-28" */
  toolbarStickyTop?: string;
}

export const RichTextEditor = ({
  initialContent = '',
  onContentChange,
  placeholder = 'Write something...',
  toolbarStickyTop = 'top-0',
}: RichTextEditorProps) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty());

  useEffect(() => {
    if (initialContent) {
      const htmlContent = initialContent
        .replace(/^-\s(.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\.\s(.*$)/gm, '<li>$1</li>')
        .replace(/<li>.*<\/li>+/g, (match) => `-${match.trim()}`)
        .replace(/<li>(.*?)<\/li>/g, '$1')
        .replace(/\r\n/g, '\n')
        .replace(/^\s*-\s*(.*$)/gm, '- $1')
        .replace(/^\s*\d+\.\s*(.*$)/gm, '1. $1');

      const rawData = markdownToDraft(htmlContent);
      const contentState = convertFromRaw(rawData);
      setEditorState(EditorState.createWithContent(contentState));
    }
  }, [initialContent]);

  const handleChange = (newState: EditorState) => {
    if (onContentChange) {
      onContentChange(draftToHtml(convertToRaw(newState.getCurrentContent())));
    }
    setEditorState(newState);
  };

  const handlePastedText = useCallback(
    (
      text: string,
      html: string | undefined,
      state: EditorState,
      onChange?: (state: EditorState) => void
    ): boolean => {
      const cleanedText = cleanPastedText(text);
      const htmlToConvert = html ? cleanPastedHtml(html) : null;
      const contentState = state.getCurrentContent();
      const selection = state.getSelection();
      try {
        const result = htmlToConvert
          ? convertFromHTML(htmlToConvert)
          : convertFromHTML(`<p>${cleanedText.replace(/\n/g, '</p><p>')}</p>`);
        const blocks = result?.contentBlocks ?? result;
        const contentBlocks = Array.isArray(blocks)
          ? blocks
          : (result as { contentBlocks: ContentBlock[] }).contentBlocks;
        if (!contentBlocks?.length) return false;
        const fragment = Immutable.OrderedMap<string, ContentBlock>(
          contentBlocks.map((block: ContentBlock) => [block.getKey(), block])
        );
        const newContent = Modifier.replaceWithFragment(contentState, selection, fragment);
        const newState = EditorState.push(state, newContent, 'insert-fragment');
        setEditorState(newState);
        if (onContentChange) {
          onContentChange(draftToHtml(convertToRaw(newState.getCurrentContent())));
        }
        onChange?.(newState);
        return true;
      } catch {
        return false;
      }
    },
    [onContentChange]
  );

  return (
    <div className="border rounded-lg p-4 bg-white">
      <Editor
        editorState={editorState}
        onEditorStateChange={handleChange}
        placeholder={placeholder}
        handlePastedText={handlePastedText}
        editorClassName="rich-text-editor-content min-h-[300px] p-4 prose max-w-none prose-p:my-2 prose-li:my-1 prose-h2:mt-4 prose-h2:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:capitalize [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:capitalize [&_h2]:py-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:capitalize [&_h3]:py-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:list-disc [&_li]:ml-8 [&_p]:my-2"
        toolbarClassName={`border-t-0 border-l-0 border-r-0 bg-gray-50 sticky ${toolbarStickyTop} z-10 rounded-t-lg`}
      />
    </div>
  );
};
