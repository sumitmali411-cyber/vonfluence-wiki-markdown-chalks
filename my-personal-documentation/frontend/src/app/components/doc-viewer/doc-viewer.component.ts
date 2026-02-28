import {
  Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { DocsService } from '../../services/docs.service';
import { Document } from '../../models/document.model';

declare function parseConfluence(text: string): string;
declare const DOMPurify: { sanitize(html: string, opts?: object): string };

// Wiki engine scripts are loaded once from assets
let wikiEngineReady = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureWikiEngine(): Promise<void> {
  if (wikiEngineReady) return;
  await loadScript('assets/wiki-engine/dompurify.min.js');
  await loadScript('assets/wiki-engine/confluence-parser.js');
  await loadScript('assets/wiki-engine/mermaid-loader.js');
  wikiEngineReady = true;
}

@Component({
  selector: 'app-doc-viewer',
  standalone: true,
  imports: [NgIf, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="viewer-toolbar">
      <div class="viewer-meta" *ngIf="doc">
        <span class="category-chip">{{ doc.category }}</span>
        <h1 class="doc-title">{{ doc.title }}</h1>
      </div>
      <div class="viewer-actions" *ngIf="doc">
        <button mat-stroked-button (click)="editDoc()" matTooltip="Edit this document">
          <mat-icon>edit</mat-icon> Edit
        </button>
        <button mat-stroked-button (click)="exportPdf()" matTooltip="Print / Save as PDF">
          <mat-icon>picture_as_pdf</mat-icon> PDF
        </button>
        <button mat-stroked-button color="warn" (click)="deleteDoc()" matTooltip="Delete document">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </div>

    <div *ngIf="loading" class="spinner-wrap">
      <mat-spinner diameter="48"></mat-spinner>
    </div>

    <div *ngIf="error" class="error-banner">
      <mat-icon>error</mat-icon> {{ error }}
    </div>

    <div class="wiki-content" #contentEl></div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .viewer-toolbar {
      display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
      padding: 16px 24px 12px; border-bottom: 1px solid var(--border-color, #e0e0e0);
      background: var(--surface, #fff);
    }
    .viewer-meta { flex: 1; min-width: 0; }
    .doc-title { margin: 4px 0 0; font-size: 1.4rem; font-weight: 500; }
    .category-chip {
      display: inline-block; font-size: 0.75rem; padding: 2px 8px;
      background: rgba(63,81,181,0.12); border-radius: 12px; color: #3f51b5;
    }
    .viewer-actions { display: flex; gap: 8px; align-items: center; padding-top: 4px; }
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .error-banner {
      display: flex; align-items: center; gap: 8px; padding: 16px 24px;
      color: #d32f2f; background: #ffebee; border-radius: 4px; margin: 16px 24px;
    }
    .wiki-content { flex: 1; overflow: auto; padding: 24px 32px; max-width: 960px; }
  `]
})
export class DocViewerComponent implements OnInit, OnDestroy {
  @ViewChild('contentEl', { static: true }) contentEl!: ElementRef<HTMLDivElement>;

  doc: Document | null = null;
  loading = false;
  error = '';

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocsService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.url.subscribe(segments => {
      // segments[0] = 'docs', rest = document id parts
      const id = segments.slice(1).map(s => s.path).join('/');
      if (id && id !== 'new') {
        this.loadDoc(id);
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadDoc(id: string): void {
    this.loading = true;
    this.error = '';
    this.docs.get(id).subscribe({
      next: doc => {
        this.doc = doc;
        this.loading = false;
        this.renderContent(doc);
      },
      error: () => {
        this.error = `Document "${id}" not found.`;
        this.loading = false;
      }
    });
  }

  private async renderContent(doc: Document): Promise<void> {
    const el = this.contentEl.nativeElement;
    el.innerHTML = '';
    try {
      await ensureWikiEngine();
      const rawHtml = (window as any)['parseConfluence'](doc.content || '');
      const clean = (window as any)['DOMPurify'].sanitize(rawHtml, {
        ADD_ATTR: ['class', 'style', 'target', 'rel'],
        ADD_TAGS: ['blockquote']
      });
      el.innerHTML = clean;
      await (window as any)['renderMermaid'](el);
    } catch (e) {
      el.innerHTML = `<pre>${doc.content}</pre>`;
    }
  }

  editDoc(): void {
    if (this.doc) this.router.navigate(['/docs', this.doc.id, 'edit']);
  }

  exportPdf(): void {
    const prev = document.title;
    document.title = this.doc?.title ?? 'Document';
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  }

  deleteDoc(): void {
    if (!this.doc || !confirm(`Delete "${this.doc.title}"?`)) return;
    this.docs.delete(this.doc.id).subscribe({
      next: () => this.router.navigate(['/docs/getting-started']),
      error: () => alert('Failed to delete document.')
    });
  }
}
