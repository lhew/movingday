import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';

import { InlineAlertComponent } from './inline-alert.component';

describe('InlineAlertComponent', () => {
  let spectator: Spectator<InlineAlertComponent>;

  const createComponent = createComponentFactory({
    component: InlineAlertComponent,
  });

  beforeEach(() => {
    spectator = createComponent({ props: { message: 'Something went wrong' } });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should display the message', () => {
    const span = spectator.query('span');
    expect(span?.textContent?.trim()).toBe('Something went wrong');
  });

  it('should emit dismiss when the dismiss button is clicked', () => {
    const dismissSpy = vi.fn();
    spectator.component.dismiss.subscribe(dismissSpy);

    spectator.click('button');

    expect(dismissSpy).toHaveBeenCalledOnce();
  });

  it('should render with alert-error class', () => {
    const alert = spectator.query('[role="alert"]');
    expect(alert?.classList).toContain('alert-error');
  });
});
