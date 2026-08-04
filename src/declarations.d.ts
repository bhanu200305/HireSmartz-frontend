// Extend the Window interface to include webdocket for WebSocket
declare global {
  interface Window {
    webdocket: WebSocket | null;
  }
}
export {};
declare module 'draftjs-to-markdown';

declare module 'markdown-draft-js' {
  import { RawDraftContentState } from 'draft-js';
  function markdownToDraft(markdown: string): RawDraftContentState;
  export = markdownToDraft;
  export interface MarkdownToDraftOptions {
    remarkableOptions?: any;
    remarkablePreset?: string;
    preserveNewlines?: boolean;
  }

  export function markdownToDraft(
    markdown: string,
    options?: MarkdownToDraftOptions
  ): RawDraftContentState;
}

declare module 'draft-js-export-markdown' {
  import { RawDraftContentState } from 'draft-js';

  export interface Options {
    escapeMarkdownCharacters?: boolean;
    gfm?: boolean;
  }

  export function stateToMarkdown(content: RawDraftContentState, options?: Options): string;
}

declare module 'html-to-draftjs' {
  import { ContentBlock, RawDraftContentBlock } from 'draft-js';

  interface HTMLToDraftJSResult {
    contentBlocks: ContentBlock[];
    entityMap: unknown;
  }

  function htmlToDraft(html: string): HTMLToDraftJSResult;
  export = htmlToDraft;
}

declare module 'draftjs-to-html' {
  import { RawDraftContentState } from 'draft-js';

  function draftToHtml(raw: RawDraftContentState): string;
  export = draftToHtml;
}

declare module 'turndown' {
  interface TurndownRule {
    filter: string | string[];
    replacement: (content: string, node: HTMLElement, options: any) => string;
  }

  class TurndownService {
    constructor(options?: TurndownService.Options);
    turndown(html: string): string;
    addRule(name: string, rule: TurndownRule): void;
  }

  namespace TurndownService {
    interface Options {
      headingStyle?: 'setext' | 'atx';
      hr?: string;
      bulletListMarker?: '-' | '+' | '*';
      codeBlockStyle?: 'indented' | 'fenced';
      fence?: '```' | '~~~';
      emDelimiter?: '_' | '*';
      strongDelimiter?: '__' | '**';
      linkStyle?: 'inlined' | 'referenced';
      linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
    }
  }

  export = TurndownService;
}
