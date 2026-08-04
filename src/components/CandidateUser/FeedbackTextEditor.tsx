import { useState, useEffect } from 'react';
import { Editor } from 'react-draft-wysiwyg';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import 'draft-js/dist/Draft.css';

interface FeedbackTextEditorProps {
  initialContent?: string; // should be a raw JSON string
  onContentChange?: (content: string) => void; // emits raw JSON string
  placeholder?: string;
  readOnly?: boolean;
}

export const FeedbackTextEditor = ({
  initialContent = '',
  onContentChange,
  placeholder = 'Start typing here...',
  readOnly = false,
}: FeedbackTextEditorProps) => {
  const [editorState, setEditorState] = useState(() => {
    if (initialContent) {
      try {
        // Only try to parse if it looks like valid JSON
        if (
          typeof initialContent === 'string' &&
          initialContent.trim().startsWith('{') &&
          initialContent.trim().endsWith('}')
        ) {
          const rawData = JSON.parse(initialContent);
          const contentState = convertFromRaw(rawData);
          return EditorState.createWithContent(contentState);
        } else {
          console.warn('initialContent is not valid Draft.js raw JSON. Initializing empty editor.');
        }
      } catch (error) {
        console.error('Error parsing initial content:', error);
      }
    }
    return EditorState.createEmpty();
  });

  // Sync editor state when initialContent changes
  useEffect(() => {
    if (initialContent) {
      try {
        if (
          typeof initialContent === 'string' &&
          initialContent.trim().startsWith('{') &&
          initialContent.trim().endsWith('}')
        ) {
          const rawData = JSON.parse(initialContent);
          const contentState = convertFromRaw(rawData);
          setEditorState(EditorState.createWithContent(contentState));
        } else {
          setEditorState(EditorState.createEmpty());
        }
      } catch (error) {
        console.error('Error parsing initial content:', error);
        setEditorState(EditorState.createEmpty());
      }
    } else {
      setEditorState(EditorState.createEmpty());
    }
  }, [initialContent]);

  const handleEditorChange = (newState: EditorState) => {
    setEditorState(newState);
    if (!onContentChange && !readOnly) {
      console.warn('FeedbackTextEditor: onContentChange prop is missing!');
    }
    if (onContentChange && !readOnly) {
      const contentState = newState.getCurrentContent();
      const rawContent = convertToRaw(contentState);
      onContentChange(JSON.stringify(rawContent));
    }
  };

  const toolbarConfig = {
    options: [
      'inline',
      'blockType',
      'fontSize',
      'list',
      'textAlign',
      'colorPicker',
      'link',
      'emoji',
      'history',
    ],
    inline: {
      options: ['bold', 'italic', 'underline', 'strikethrough'],
    },
    blockType: {
      options: ['Normal', 'H1', 'H2', 'H3', 'Blockquote'],
    },
    fontSize: {
      options: [12, 14, 16, 18, 24, 30],
    },
    list: {
      options: ['unordered', 'ordered'],
    },
    textAlign: {
      options: ['left', 'center', 'right'],
    },
    colorPicker: {
      colors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
    },
    link: {
      showOpenOptionOnHover: true,
      defaultTargetOption: '_blank',
    },
    emoji: {},
    history: {},
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {readOnly && <div className="text-xs text-gray-400 px-4 pt-2 pb-0">(Read-only mode)</div>}
      <Editor
        editorState={editorState}
        onEditorStateChange={handleEditorChange}
        toolbar={readOnly ? undefined : toolbarConfig}
        placeholder={placeholder}
        readOnly={readOnly}
        editorClassName="min-h-[200px] p-4 prose max-w-none"
        toolbarClassName="border-b border-gray-200 bg-gray-50 rounded-t-lg"
        wrapperClassName="w-full"
        editorStyle={{
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.6',
          minHeight: '200px',
        }}
        toolbarStyle={{
          borderBottom: '1px solid #e5e7eb',
          marginBottom: 0,
        }}
      />
    </div>
  );
};
