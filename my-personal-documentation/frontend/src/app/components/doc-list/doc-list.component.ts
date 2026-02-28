import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocsService } from '../../services/docs.service';
import { CategoryGroup, DocumentMeta } from '../../models/document.model';

@Component({
  selector: 'app-doc-list',
  standalone: true,
  imports: [
    NgFor, NgIf, AsyncPipe, RouterLink, RouterLinkActive,
    MatListModule, MatIconModule, MatExpansionModule,
    MatProgressSpinnerModule, MatButtonModule, MatTooltipModule
  ],
  template: `
    <div class="doc-list-header">
      <span class="doc-list-title">Documents</span>
      <button mat-icon-button (click)="openNew()" matTooltip="New document">
        <mat-icon>add</mat-icon>
      </button>
      <button mat-icon-button (click)="load()" matTooltip="Refresh">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>

    <div *ngIf="loading" class="spinner-wrap">
      <mat-spinner diameter="32"></mat-spinner>
    </div>

    <div *ngIf="error" class="error-msg">{{ error }}</div>

    <mat-accordion *ngIf="!loading && groups.length" displayMode="flat" multi>
      <mat-expansion-panel *ngFor="let group of groups" [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title class="category-label">
            <mat-icon class="category-icon">folder</mat-icon>
            {{ group.name }}
          </mat-panel-title>
        </mat-expansion-panel-header>

        <mat-nav-list dense>
          <a mat-list-item
             *ngFor="let doc of group.docs"
             [routerLink]="['/docs', doc.id]"
             routerLinkActive="active-doc"
             class="doc-item">
            <mat-icon matListItemIcon>article</mat-icon>
            <span matListItemTitle>{{ doc.title }}</span>
          </a>
        </mat-nav-list>
      </mat-expansion-panel>
    </mat-accordion>

    <div *ngIf="!loading && !groups.length && !error" class="empty-msg">
      No documents yet. Click + to create one.
    </div>
  `,
  styles: [`
    .doc-list-header {
      display: flex;
      align-items: center;
      padding: 8px 8px 4px 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    .doc-list-title { flex: 1; font-weight: 500; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .spinner-wrap { display: flex; justify-content: center; padding: 24px; }
    .error-msg { color: #d32f2f; padding: 16px; font-size: 0.85rem; }
    .empty-msg { padding: 16px; color: #757575; font-size: 0.85rem; }
    .category-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 500; }
    .category-icon { font-size: 18px; width: 18px; height: 18px; }
    .doc-item { font-size: 0.875rem; }
    ::ng-deep .active-doc { background: rgba(63, 81, 181, 0.12) !important; }
    mat-expansion-panel { box-shadow: none !important; border-radius: 0 !important; }
  `]
})
export class DocListComponent implements OnInit {
  groups: CategoryGroup[] = [];
  loading = false;
  error = '';

  constructor(private docs: DocsService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.docs.list().subscribe({
      next: metas => {
        this.groups = this.groupByCategory(metas);
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load documents. Is the backend running?';
        this.loading = false;
      }
    });
  }

  openNew(): void {
    this.router.navigate(['/docs/new']);
  }

  private groupByCategory(metas: DocumentMeta[]): CategoryGroup[] {
    const map = new Map<string, DocumentMeta[]>();
    for (const m of metas) {
      const cat = m.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, docs]) => ({ name, docs }));
  }
}
