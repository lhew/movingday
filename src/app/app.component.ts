import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthMenuComponent } from './shared/components/auth-menu/auth-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AuthMenuComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
