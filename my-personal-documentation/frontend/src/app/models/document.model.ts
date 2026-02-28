export interface DocumentMeta {
  id: string;
  title: string;
  category: string;
  format: 'wiki' | 'markdown' | string;
  lastModified: string;
}

export interface Document extends DocumentMeta {
  content: string;
}

export interface CategoryGroup {
  name: string;
  docs: DocumentMeta[];
}
