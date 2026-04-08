import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssBox, cssNotes, cssChart } from '@ng-icons/css.gg';
import { AuthMenuComponent } from './shared/components/auth-menu/auth-menu.component';

const SLOGANS = [
  'Your stuff deserves a second chapter.',
  'Good things find new homes.',
  'Less packing, more sharing.',
  'Everything must go — to someone who\'ll love it.',
  'One move, many new beginnings.',
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AuthMenuComponent, NgIcon],
  providers: [provideIcons({ cssBox, cssNotes, cssChart })],
  template: `<div class="min-h-screen flex flex-col"><nav class="navbar bg-base-100 shadow-sm sticky top-0 z-50"><div class="navbar-start"><div class="dropdown lg:hidden"><label tabindex="0" class="btn btn-ghost btn-circle"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg></label><ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"><li><a routerLink="/showcase" routerLinkActive="font-semibold"><ng-icon name="cssBox" aria-hidden="true" /> Free Stuff</a></li><li><a routerLink="/updates" routerLinkActive="font-semibold"><ng-icon name="cssNotes" aria-hidden="true" /> Updates</a></li></ul></div><a routerLink="/" class="btn btn-ghost text-xl gap-2 font-bold"><ng-icon name="cssBox" aria-hidden="true" /> Moving Day</a></div><div class="navbar-center hidden lg:flex"><ul class="menu menu-horizontal px-1 gap-1"><li><a routerLink="/showcase" routerLinkActive="active" class="rounded-lg"><ng-icon name="cssBox" aria-hidden="true" /> Free Stuff</a></li><li><a routerLink="/updates" routerLinkActive="active" class="rounded-lg"><ng-icon name="cssNotes" aria-hidden="true" /> Updates</a></li></ul></div><div class="navbar-end gap-2"><app-auth-menu /></div></nav><main class="flex-1"><router-outlet></router-outlet></main><footer class="footer footer-center p-6 bg-base-200 text-base-content text-sm opacity-70"><p>{{ slogan }}</p><p><small><a routerLink="/stats" class="link link-hover"><ng-icon name="cssChart" aria-hidden="true" /> stats for nerds</a></small></p></footer></div>`,
})
export class AppComponent {
  readonly slogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
}
