import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * P2-3788 — every wrapper that does not hand `readOnly` to its `app-field-card` must hand it
 * `editLocked`, or a click on a locked control shows "Unsaved changes" on a result that cannot be
 * saved (reported on the Yes/No and the region chips of a Pending Review W3 result).
 *
 * On the MARKUP on purpose: the wrappers' own specs do not render the card with a real click.
 */
describe('app-field-card · P2-3788 every locked wrapper passes editLocked', () => {
  const wrappers = [
    'pr-yes-or-not/pr-yes-or-not.component.html',
    'pr-radio-button/pr-radio-button.component.html',
    'pr-select/pr-select.component.html',
    'pr-multi-select/pr-multi-select.component.html',
    'lead-contact-person-field/lead-contact-person-field.component.html'
  ];

  it.each(wrappers)('%s binds [editLocked] on its field card', file => {
    const template = readFileSync(join(__dirname, '..', file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const card = template.match(/<app-field-card[\s\S]*?>/);
    expect(card).not.toBeNull();
    expect(card[0]).toMatch(/\[editLocked\]="[^"]+"/);
  });
});
