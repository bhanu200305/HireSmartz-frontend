// Extend the Window interface to include webdocket for WebSocket
declare global {
  interface Window {
    webdocket: WebSocket | null;
  }
}
export {};
declare module 'draftjs-to-markdown';

declare module 'draft-js-export-markdown' {
  import { RawDraftContentState } from 'draft-js';

  export interface Options {
    escapeMarkdownCharacters?: boolean;
    gfm?: boolean;
  }

  export function stateToMarkdown(content: RawDraftContentState, options?: Options): string;
}

declare module 'html-to-draftjs' {
  import { ContentBlock } from 'draft-js';

  interface HTMLToDraftJSResult {
    contentBlocks: ContentBlock[];
    entityMap: unknown;
  }

  function htmlToDraft(html: string): HTMLToDraftJSResult;
  export = htmlToDraft;
}

