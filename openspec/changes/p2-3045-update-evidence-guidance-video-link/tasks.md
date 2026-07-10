## 1. Update the tutorial video link

- [x] 1.1 In `rd-evidences.component.ts`, replace the old SharePoint video URL (`ETb3eWyBPm9F…?e=kvLk2t`) with the new one (`IQCPCRtUOihD…?e=Xoy42x`) in the Evidence-section help tip, keeping the sentence and `<a class="open_route" target="_blank">link</a>` markup unchanged.

## 2. Verification

- [x] 2.1 Confirm the URL is the only change and no other occurrence of the old link remains (`grep` across `onecgiar-pr-client/src`).
- [ ] 2.2 Manually verify in the browser: open a result's Evidence section, click the "video tutorial" link, and confirm it opens the new recording.
