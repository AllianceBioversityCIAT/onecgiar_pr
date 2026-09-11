## ADDED Requirements

### Requirement: Floating window placement
The assistant SHALL render as a viewport-fixed floating window when open, positioned by a geometry state of x, y, width, and height. When it opens for the first time (no persisted geometry) it SHALL default to the bottom-right corner at a default size, fitting within the viewport with a minimum margin.

#### Scenario: First open with no persisted geometry
- **WHEN** the user opens the assistant and no window geometry is stored
- **THEN** the window appears anchored to the bottom-right corner at the default size, fully inside the viewport

#### Scenario: Launcher hides while window is open
- **WHEN** the assistant window is open
- **THEN** the launcher FAB is hidden and non-interactive, and it returns when the window is closed

### Requirement: Drag to reposition
The user SHALL be able to drag the window by its header to any position, and the window MUST remain fully within the viewport bounds (respecting the minimum margin) throughout and after the drag.

#### Scenario: Dragging the header moves the window
- **WHEN** the user presses on the header and moves the pointer
- **THEN** the window follows the pointer and does not move past the viewport edges

#### Scenario: Pressing a header control does not start a drag
- **WHEN** the user presses the reset or close control in the header
- **THEN** that control's action runs and no drag begins

### Requirement: Resize from edges and corners
The user SHALL be able to resize the window from any of its four edges or four corners. Width and height MUST NOT go below the defined minimum, and the resulting rectangle MUST stay within the viewport.

#### Scenario: Corner resize grows the window
- **WHEN** the user drags the bottom-right corner outward
- **THEN** the window width and height increase, bounded by the viewport

#### Scenario: Minimum size is enforced
- **WHEN** the user drags an edge inward past the minimum size
- **THEN** the window stops shrinking at the minimum width/height

### Requirement: Geometry persistence and viewport clamping
The window geometry SHALL persist to browser storage and be restored on reopen. On restore, and whenever the viewport is resized, the geometry MUST be re-clamped so the window stays visible and within bounds. Malformed or unavailable storage MUST fall back to the default placement without error.

#### Scenario: Geometry restored on reopen
- **WHEN** the user moves or resizes the window, then closes and reopens it
- **THEN** the window reappears at the last position and size

#### Scenario: Re-clamp on viewport shrink
- **WHEN** the viewport becomes smaller than the stored window bounds
- **THEN** the window is repositioned and/or resized to stay fully visible

#### Scenario: Corrupt stored geometry
- **WHEN** the stored geometry value is missing or malformed
- **THEN** the window opens at the default bottom-right placement without throwing

### Requirement: Reset placement
The window header SHALL provide a control that restores the default bottom-right placement and size and persists it.

#### Scenario: Reset restores the default corner
- **WHEN** the user activates the reset control
- **THEN** the window returns to the default bottom-right position and size, and that geometry is persisted
