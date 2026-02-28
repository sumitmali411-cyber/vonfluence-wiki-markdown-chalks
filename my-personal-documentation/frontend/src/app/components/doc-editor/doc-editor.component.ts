import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DocsService } from '../../services/docs.service';

@Component({
  selector: 'app-doc-editor',
  standalone: true,
  imports: [
    NgIf, FormsModule,
    MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
    <div class="editor-toolbar">
      <button mat-icon-button (click)="cancel()" matTooltip="Cancel">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span class="editor-title">{{ isNew ? 'New Document' : 'Edit: ' + docId }}</span>
      <div class="spacer"></div>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">
        <mat-icon>save</mat-icon> {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>

    <div class="editor-fields">
      <mat-form-field appearance="outline" class="field-id" *ngIf="isNew">
        <mat-label>Document ID (e.g. team/my-doc)</mat-label>
        <input matInput [(ngModel)]="docId" placeholder="category/document-name" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-category" *ngIf="isNew">
        <mat-label>Category</mat-label>
        <input matInput [(ngModel)]="category" placeholder="General" />
      </mat-form-field>
    </div>

    <div class="editor-body">
      <textarea
        class="wiki-textarea"
        [(ngModel)]="content"
        placeholder="Write Confluence wiki markup here…

h1. My Document Title

h2. Section

Write *bold*, _italic_, or {{monospace}} text.

{mermaid}
graph TD
  A --> B
{/mermaid}"
        spellcheck="false"
      ></textarea>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .editor-toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-bottom: 1px solid var(--border-color, #e0e0e0);
      background: var(--surface, #fff); flex-shrink: 0;
    }
    .editor-title { font-size: 1rem; font-weight: 500; }
    .spacer { flex: 1; }
    .editor-fields {
      display: flex; gap: 16px; padding: 16px 24px 0; flex-wrap: wrap;
    }
    .field-id { flex: 2; min-width: 200px; }
    .field-category { flex: 1; min-width: 140px; }
    .editor-body { flex: 1; padding: 8px 24px 24px; display: flex; }
    .wiki-textarea {
      flex: 1; width: 100%; resize: none;
      font-family: 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.9rem; line-height: 1.6;
      border: 1px solid #ccc; border-radius: 4px; padding: 12px;
      background: var(--editor-bg, #fafafa);
      outline: none;
    }
    .wiki-textarea:focus { border-color: #3f51b5; box-shadow: 0 0 0 2px rgba(63,81,181,0.15); }
  `]
})
export class DocEditorComponent implements OnInit {
  docId = '';
  category = '';
  content = '';
  saving = false;
  isNew = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const segments = this.route.snapshot.url;
    // URL: /docs/:id/edit  OR  /docs/new
    if (segments.length && segments[segments.length - 1].path === 'new') {
      this.isNew = true;
    } else {
      this.docId = segments.slice(1, -1).map(s => s.path).join('/');
      this.loadDoc();
    }
  }

  private loadDoc(): void {
    if (!this.docId) return;
    this.docs.get(this.docId).subscribe({
      next: doc => {
        this.content = doc.content;
        this.category = doc.category;
      },
      error: () => this.snack.open('Document not found', 'Close', { duration: 3000 })
    });
  }

  save(): void {
    const id = this.docId.trim();
    if (!id) { this.snack.open('Document ID is required', 'Close', { duration: 3000 }); return; }
    this.saving = true;
    this.docs.save(id, this.content, this.category).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Saved!', '', { duration: 2000 });
        this.router.navigate(['/docs', id]);
      },
      error: () => {
        this.saving = false;
        this.snack.open('Failed to save', 'Close', { duration: 4000 });
      }
    });
  }

  cancel(): void {
    this.router.navigate([this.docId ? `/docs/${this.docId}` : '/']);
  }
}
