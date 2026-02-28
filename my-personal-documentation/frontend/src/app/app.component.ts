import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DocListComponent } from './components/doc-list/doc-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    DocListComponent
  ],
  template: `
    <mat-toolbar color="primary" class="app-toolbar">
      <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle navigation">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="app-title">Personal Docs</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="toggleTheme()" [attr.aria-label]="darkMode ? 'Switch to light mode' : 'Switch to dark mode'">
        <mat-icon>{{ darkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>

    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <app-doc-list></app-doc-list>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; }
    .app-toolbar { flex-shrink: 0; z-index: 10; }
    .app-title { font-size: 1.2rem; font-weight: 500; margin-left: 8px; }
    .spacer { flex: 1; }
    .sidenav-container { flex: 1; overflow: hidden; }
    .sidenav { width: 280px; border-right: 1px solid var(--border-color, #e0e0e0); }
    .main-content { padding: 0; overflow: auto; }
  `]
})
export class AppComponent {
  darkMode = false;

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    document.body.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
  }
}
