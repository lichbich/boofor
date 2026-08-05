declare module 'html-to-docx' {
  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: any,
    margins?: any
  ): Promise<Blob | Buffer>;
}
