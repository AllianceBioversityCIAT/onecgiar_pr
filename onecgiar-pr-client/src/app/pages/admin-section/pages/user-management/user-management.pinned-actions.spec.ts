import { readFileSync } from 'fs';
import { join } from 'path';

describe('UserManagementComponent - pinned Actions column (markup/style contract)', () => {
  const html = readFileSync(join(__dirname, 'user-management.component.html'), 'utf8');
  const scss = readFileSync(join(__dirname, 'user-management.component.scss'), 'utf8');

  it('marks the Actions header and body cells with col-actions', () => {
    expect(html).toContain(`[class.col-actions]="column.key === 'actions'"`);
    expect(html).toContain('<td class="col-actions">');
  });

  it('pins .col-actions to the right edge with sticky positioning', () => {
    const block = scss.slice(scss.indexOf('.col-actions {'));
    expect(block).toMatch(/position:\s*sticky/);
    expect(block).toMatch(/right:\s*0/);
    expect(block).toMatch(/box-shadow:\s*-/);
  });

  it('keeps opaque backgrounds (body, hover) and a header z-index above the cells but below dialogs', () => {
    expect(scss).toMatch(/tbody td\.col-actions\s*{\s*background:\s*var\(--pr-color-white\)/);
    expect(scss).toMatch(/tbody tr:hover td\.col-actions\s*{\s*background:\s*#fafafb/);
    const z = Number(/thead th\.col-actions\s*{\s*z-index:\s*(\d+)/.exec(scss)?.[1]);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThan(1100);
  });
});
