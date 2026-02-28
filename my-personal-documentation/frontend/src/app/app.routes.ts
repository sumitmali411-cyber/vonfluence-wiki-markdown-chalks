import { Routes } from '@angular/router';
import { DocViewerComponent } from './components/doc-viewer/doc-viewer.component';
import { DocEditorComponent } from './components/doc-editor/doc-editor.component';

export const routes: Routes = [
  { path: 'docs/new', component: DocEditorComponent },
  { path: 'docs/:id/edit', component: DocEditorComponent },
  { path: 'docs/**', component: DocViewerComponent },
  { path: '', redirectTo: 'docs/getting-started', pathMatch: 'full' },
  { path: '**', redirectTo: 'docs/getting-started' }
];
