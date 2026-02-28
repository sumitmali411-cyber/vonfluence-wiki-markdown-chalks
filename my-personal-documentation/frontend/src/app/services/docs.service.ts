import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Document, DocumentMeta } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly base = '/api/docs';

  constructor(private http: HttpClient) {}

  list(): Observable<DocumentMeta[]> {
    return this.http.get<DocumentMeta[]>(this.base);
  }

  get(id: string): Observable<Document> {
    return this.http.get<Document>(`${this.base}/${id}`);
  }

  save(id: string, content: string, category = ''): Observable<Document> {
    return this.http.post<Document>(`${this.base}/${id}`, { content, category });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
