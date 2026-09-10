## bilateral-auto-save

Automatic field persistence service for the bilateral result form. Debounces text input, saves selects immediately, and flushes pending changes on accordion collapse and route navigation.

### Requirements

- REQ-1: Text fields (title, description): 800ms debounce + save on blur.
- REQ-2: Selects, checkboxes, radio buttons: immediate save on change.
- REQ-3: Accordion collapse: flush pending saves before collapsing. No confirm dialog.
- REQ-4: Route navigation: `canActivate` guard flushes pending saves before allowing navigation.
- REQ-5: Visual feedback per field: "Saving..." → "Saved ✓" (2s fade) → or "Save failed — Retry" (red).
- REQ-6: Only sends changed fields (partial PATCH). Tracks dirty state per field.
- REQ-7: On PATCH success: updates MDS tracker with new field values.
- REQ-8: On PATCH failure: retries once after 2s. If still fails, shows persistent error.

### Service Interface

```typescript
@Injectable({ providedIn: 'root' })
export class BilateralAutoSaveService {
  // Per-field save status (for visual feedback)
  fieldStatus$: Signal<Map<string, 'idle' | 'saving' | 'saved' | 'error'>>;

  // Whether any pending saves exist (for navigation guard)
  hasPendingSaves$: Signal<boolean>;

  // Register a field for auto-save
  registerField(fieldPath: string, fieldType: 'text' | 'select' | 'checkbox'): void;

  // Update a field value (triggers save logic based on field type)
  updateField(fieldPath: string, value: unknown): void;

  // Flush all pending saves (returns promise that resolves when all PATCHes complete)
  flush(): Promise<void>;

  // Unregister all fields (on route change)
  reset(): void;
}
```

### Save Flow

```
User types in text field
  → 800ms debounce timer starts
  → If user continues typing → timer resets
  → If user blurs field → save immediately (cancel timer)
  → Timer fires → PATCH /api/results/:id { [fieldPath]: value }
  → On success: fieldStatus = 'saved', MDS tracker updated
  → On failure: retry once after 2s → if still fails: fieldStatus = 'error'

User changes select/checkbox
  → Immediate PATCH /api/results/:id { [fieldPath]: value }
  → Same success/failure handling

User clicks accordion header to collapse
  → If hasPendingSaves: await flush() → then collapse
  → If no pending: collapse immediately

User navigates away (route change)
  → canActivate guard checks hasPendingSaves
  → If true: await flush() → then allow navigation
  → If false: allow navigation immediately
```

### Visual Feedback

```
Field state transitions:
  idle → saving    → "Saving..." (12px, #757575, appears below field)
  saving → saved   → "Saved ✓" (12px, #2E7D32, fades out after 2s)
  saving → error   → "Save failed — Retry" (12px, #C62828, clickable)
  error → saving   → "Retrying..." (on click)
  saved → idle     → after 2s fade
```
