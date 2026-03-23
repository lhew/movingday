import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { provideRouter } from '@angular/router';

import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let spectator: Spectator<NotFoundComponent>;

  const createComponent = createComponentFactory({
    component: NotFoundComponent,
    providers: [provideRouter([])],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create the component', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should render the 404 box emoji', () => {
    expect(spectator.element.textContent).toContain('📦');
  });

  it('should render the "This box is empty" heading', () => {
    expect(spectator.element.textContent).toContain('This box is empty');
  });

  it('should contain a link back to the home page', () => {
    const link = spectator.query('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/');
  });
});
