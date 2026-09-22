The footer at the bottom of the editor stays in place as you scroll and holds two groups of
controls. On the left, **Back** and **Next** step you between sections, next to a **position
indicator** reading "Section X of Y" for the section you currently have open — a plain count of
where you are, separate from the rail's own "N of M sections complete" progress bar, which counts
how much of the form is actually done.

On the right, the footer shows the open section's own save state — **Unsaved changes**, **Section
complete**, a pill reading "N fields missing" (or "N fields to fix" once some of those fields are
filled in but invalid), or **Draft up to date** — next to the **Save draft** button. Clicking the
"fields missing/to fix" pill opens a small panel naming each one, with a **Go** link that jumps to
and briefly highlights the field when it can be found uniquely on screen.

**Save draft** saves whatever is filled in, even if the section is incomplete — it does not require
every required field first. Save it once and the footer's message updates to say what, if anything,
is still missing or still needs fixing; a failed save shows the server's own reason for the failure,
not a generic error.
