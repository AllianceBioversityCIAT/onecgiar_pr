import { IpsrPrincipalImpactArea, IpsrStep3EvidenceLevel } from '../../model/Ipsr-step-3-body.model';

/**
 * P2-3824 — every user-facing string of the IPSR Step 3 evidence lists and of the score-2 alert.
 * Kept out of the templates so a wording or multi-language pass edits this file only.
 * The Impact Area names and the "shared publicly" guidance are the ones the Results Evidence
 * section already shows, so the same question reads the same everywhere.
 */
export const IPSR_STEP3_EVIDENCE_COPY = {
  listTitle: (level: IpsrStep3EvidenceLevel) => (level === 'readiness' ? 'Innovation Readiness level evidence' : 'Innovation use level evidence'),
  listHint: 'Add links or upload files that support the level selected above.',
  feedbackLabel: (level: IpsrStep3EvidenceLevel) =>
    level === 'readiness' ? 'At least one Innovation Readiness level evidence' : 'At least one Innovation use level evidence',
  requiredNote: 'At least one piece of evidence is required for this level.',
  empty: 'No evidence added yet',
  addButton: 'Add evidence',
  counter: (count: number, max: number) => `${count} / ${max} evidence added (for this component)`,
  capReached: (max: number) => `This component already has ${max} pieces of evidence. Remove one to add another.`,

  linkKind: 'Link evidence',
  fileKind: 'File evidence',
  legacyBadge: 'Previously reported',
  publicFile: 'Public',
  privateFile: 'Private',
  open: 'Open',
  edit: 'Edit evidence',
  remove: 'Remove evidence',
  removeConfirmTitle: 'Are you sure you want to remove this evidence?',
  removeConfirmText: 'Yes, remove',
  removeNote: 'The change is stored when you save the step.',

  dialogAddTitle: 'Add New Evidence',
  dialogEditTitle: 'Edit Evidence',
  dialogSubtitle: (level: IpsrStep3EvidenceLevel) => (level === 'readiness' ? 'Innovation Readiness level' : 'Innovation use level'),
  close: 'Close',
  cancel: 'Cancel',
  confirmAdd: 'Add evidence',
  confirmEdit: 'Save changes',

  sourceLabel: 'Source of the evidence',
  sourceLink: 'Link',
  sourceUpload: 'Upload file',
  linkLabel: 'Link',
  linkPlaceholder: 'Add link',
  invalidLink: 'Invalid URL provided.',
  duplicateLink: 'This link is already in this list.',
  cloudLinkWarning:
    'Links to file storage platforms are not accepted. If you do not have a CGSpace or other public link available, use the “Upload file” option to upload your evidence to the PRMS repository.',
  publicQuestion: 'Can this evidence be shared publicly?',
  yes: 'Yes',
  no: 'No',
  publicYesInfo: `<b>If you indicate that the file being uploaded to the PRMS repository is public:</b>
        <li>You confirm that the file is publicly accessible.</li>
        <li>You confirm that all intellectual property rights related to the file have been observed. This includes any rights relevant to the document owner’s Center affiliation and any specific rights tied to content within the document, such as images.</li>
        <li>Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products.</li>`,
  publicNoInfo: `<b>If you indicate that the file being uploaded to the PRMS repository is NOT public:</b>
        <li>You confirm that the file should not be publicly accessible.</li>
        <li>The file will not be accessible through the CGIAR Results Dashboard.</li>
        <li>The file will be stored in the PRMS repository and will only be accessible by CGIAR staff with the repository link.</li>`,
  answerPublicFirst: 'Answer the question above to select the file.',
  fileLabel: 'File to be uploaded to the repository',
  fileTooltip: 'Documents in the PRMS repository will be <b>view-only and cannot be edited.</b>',
  dropTitle: 'Drag a file here, or',
  selectFile: 'Select file',
  replaceFile: 'Remove file',
  pendingUpload: 'Uploaded when you save the step',
  incorrectFile: (accepted: string) => `That file cannot be uploaded. Accepted: ${accepted}`,
  tagsLabel: 'Indicate whether this evidence is related to an Impact Area score of 2 and/or to Innovation Use',
  innovationUse: 'Innovation Use',
  detailsLabel: (isFile: boolean) =>
    `Please provide details of where evidence can be found within the source ${isFile ? 'file' : 'link'} (e.g. page number, slide number, table number)`,
  detailsPlaceholder: 'Add description',
  tooManyWords: (max: number) => `Details must be ${max} words or fewer.`,

  impactAreaNames: {
    gender: 'Gender equality, youth and social inclusion',
    climate: 'Climate adaptation and mitigation',
    nutrition: 'Nutrition, health and food security',
    environment: 'Environmental health and biodiversity',
    poverty: 'Poverty reduction, livelihoods and jobs'
  } as Record<IpsrPrincipalImpactArea, string>,
  principalImpactAreaAlert: (areaName: string) =>
    `A principal contribution score (2) has been recorded for the <strong>${areaName}</strong> Impact Area. Please provide evidence tagged to it in this step.`,

  uploadFailedTitle: (count: number, names: string[]) => `${count} file(s) could not be stored: ${names.join(', ')}`,
  uploadFailedDescription: 'Nothing was saved. Please re-attach those files, or remove them, and save the step again.'
};
