/**
 * P2-3295 / P2-3428 — copy of the Innovation Use "2030 Use Projection" block, shared by the W1/W2 form
 * (`shared/components/innovation-use-form`, read through `FieldsManagerService`) and the W3/bilateral
 * full metadata (`pages/bilateral/.../type-innovation-use`). One source, so the guidance-note link and
 * the youth rule cannot drift between the two forms.
 */
export const INNOVATION_USE_2030_PROJECTION_COPY = {
  title: '2030 Use Projection',
  question: 'What is the projected innovation use by end of 2030?',
  tooltip:
    "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence.",
  guidance: `<ul>
          <li>Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.</li>
          <li>If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use.</li>
          <li>The numbers should reflect the expected innovation use by end of 2030. This <a href="https://docs.google.com/document/d/1mkt4bS51CyGmHKfkvuonAiJhkl4n-mLE/" class="open_route" target="_blank">guidance note</a> outlines a practical process for estimating or projecting innovation use figures by 2030.</li>
          <li>Add information for as many as applicable.</li>
          <li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years. If age disaggregation does not apply then please apply a 50/50% rule in dividing women or men across the youth/non-youth category.</li>
          </ul>`
};
