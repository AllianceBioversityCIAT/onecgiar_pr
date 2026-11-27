// @akili-spec changes/rir-breeding-exclusion
/**
 * RBX-T-1 — frozen copy of the four RIR email templates (design.md section 6.4, DD-5).
 *
 * ## FROZEN
 *
 * Do not edit `buildRirTemplatesV2()` or `buildRirTemplatesV3()` once released. A later copy
 * change adds a new version (v5 is the latest: `buildRirTemplatesV5`, v4 with "10 February" in the
 * Center email, shipped by `1793800000000`; v4 is v3 minus the breeding
 * paragraph, shipped by `1793700000000`) and a new migration. Editing a version here
 * breaks the migration that seeded it and the `down` that restores it.
 *
 * - v2 reproduces the bodies in PROD before SR-167303: the output of the builders of
 *   `1791700000000-RIR-RecipientModelV2`, with two landed rewrites applied on top:
 *     1. the linked Result ID cell of `1791900000000-RIR-ResultIdHyperlink`, and
 *     2. the Center intro of `1793400000000-RCF-CenterRouting`, which drops the word "bilateral"
 *        (`{{resultCount}} bilateral innovation(s)` becomes `{{resultCount}} innovation(s)`).
 *   The spec proves it byte for byte by running all three landed migrations against a capturing
 *   query runner (DD-7). Any later migration that rewrites an RIR template body must be added to
 *   this list and to that spec, or v2 (and the `down` that restores it) silently drifts.
 * - v3 keeps the v2 shell head and the linked Result ID cell, and swaps the intros, the tails and
 *   the Center SP column header for the 2026-11-25 copy (design.md section 6.5). Years are
 *   Handlebars variables (`phaseYear`, `previousYear`, `nextYear`, `nextNextYear`), so the copy
 *   is year-agnostic (DD-4).
 * - v4 is derived from v3 at call time by removing the breeding paragraph (RBX-R-8).
 *
 * Pure functions: no I/O.
 */

export const RIR_Q4_TEMPLATE_NAME =
  'email_template_replicated_innovation_q4_notice';
export const RIR_FINAL_TEMPLATE_NAME =
  'email_template_replicated_innovation_final_reminder';
export const RIR_MELIA_TEMPLATE_NAME =
  'email_template_replicated_innovation_melia_summary';
export const RIR_CENTER_TEMPLATE_NAME =
  'email_template_replicated_innovation_center';

export type RirTemplateBodies = Record<string, string>;

// ---------------------------------------------------------------------------------------
// Shell shared by v2 and v3 (the v2 head, unchanged).
// ---------------------------------------------------------------------------------------

const SHELL_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PRMS Reporting Tool</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
* { font-family: 'Poppins', system-ui; }
body { line-height:1.6; max-width:800px; margin:0 auto; padding:50px 20px; color:#000; }
.header { padding:20px; padding-bottom:45px; max-width:280px; }
.content { background-color:#fafafa; padding:40px 50px; border-radius:5px; box-shadow:0px 2px 11px 0px #b0c4ddb0; margin-bottom:50px; font-weight:400; font-size:14px; }
.link { text-decoration:underline; color:#5569dd; }
.fw-600 { font-weight:600; }
.kind { display:inline-block; margin:0 0 14px; padding:2px 12px; border-radius:12px; background-color:#e8eefc; color:#3b4a8f; font-size:12px; font-weight:600; }
.results { width:100%; border-collapse:collapse; margin:18px 0 24px; font-size:13px; }
.results th { text-align:left; padding:8px 10px; border-bottom:2px solid #d5dbe6; color:#4a5568; font-weight:600; }
.results td { padding:10px; border-bottom:1px solid #e3e8ef; vertical-align:top; }
.muted { color:#666; font-size:12px; }
.redirect-notice { margin:0 0 24px; padding:12px 16px; border-left:3px solid #d9822b; background-color:#fff4e5; font-size:13px; }
.disclaimer { margin-top:26px; font-size:12px; color:#666; font-style:italic; }
</style>
</head>
<body>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse; margin:0 auto;">
<tr>
<td align="center">
<table width="700" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin:0 auto;">

<tr>
<td class="header">
<img src="https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.svg" alt="PRMS Reporting Tool"/>
</td>
</tr>

<tr>
<td class="content">

{{#if intendedTo}}
<div class="redirect-notice">
<p class="fw-600" style="margin:0 0 4px;">Intended recipients (test message)</p>
<p style="margin:0;">PRMS is not running in production, so this message was redirected to a test address. In production it would be sent to <span class="fw-600">{{intendedTo}}</span>{{#if intendedCc}} with <span class="fw-600">{{intendedCc}}</span> in copy{{/if}}.</p>
</div>
{{/if}}

<p class="kind">{{kindLabel}}</p>
`;

const DISCLAIMER =
  '<p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>';

const SHELL_CLOSE = `</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;

const SP_CELL = `{{#if spCode}}{{spCode}}{{#if spName}} – {{spName}}{{/if}}{{/if}}`;

/** The Result ID as a link to the row's own URL (1791900000000). */
const RESULT_ID_CELL =
  '<td><a class="link" href="{{resultUrl}}">{{resultCode}}</a></td>';

interface BodyParts {
  greeting: string;
  intro: string;
  spHeader: string;
  withDeveloperColumn: boolean;
  /** Everything after the results table, up to and excluding the shell close. */
  tail: string;
}

function buildBody(parts: BodyParts): string {
  const devHead = parts.withDeveloperColumn
    ? '\n<th>Innovation developer (as listed)</th>'
    : '';
  const devCell = parts.withDeveloperColumn
    ? '\n<td>{{#if developerText}}{{developerText}}{{else}}Not provided{{/if}}</td>'
    : '';
  return `${SHELL_HEAD}
<h2 class="fw-600" style="font-size:18px; margin-top:0;">${parts.greeting}</h2>

<p>${parts.intro}</p>

<table role="presentation" class="results" cellspacing="0" cellpadding="0" border="0">
<thead>
<tr>
<th>Result ID</th>
<th>Innovation</th>
<th>${parts.spHeader}</th>${devHead}
</tr>
</thead>
<tbody>
{{#each results}}
<tr>
${RESULT_ID_CELL}
<td><a class="link" href="{{resultUrl}}">{{resultTitle}}</a> · {{resultTypeName}}</td>
<td>${SP_CELL}</td>${devCell}
</tr>
{{/each}}
</tbody>
</table>
${parts.tail}`;
}

// ---------------------------------------------------------------------------------------
// v2 (PRODUCTION before SR-167303)
// ---------------------------------------------------------------------------------------

const V2_TAIL = `
<p>For existing innovations that receive active investment in {{phaseYear}}, you only need to update changes, all other existing data will be pre-filled for you to review. This should not take much of your time.</p>

<p>For existing innovations that did not receive investment in {{phaseYear}}, were stopped or put on-hold, you can indicate status 'Inactive' and provide the reason for discontinuation.</p>

<p>If you do not update your innovation result, then PRMS will automatically close them with the status 'Inactive – not updated' at the end of January {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}} and beyond).</p>

<p>This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.</p>

${DISCLAIMER}

${SHELL_CLOSE}`;

const V2_SP_HEADER = 'Science Program / Accelerator';

const V2_DEVELOPER_INTRO =
  'The CGIAR Performance and Results Management System (PRMS) shows that you have {{resultCount}} innovation(s), reported in previous years, with no update yet to reflect any work done on them during the {{phaseYear}} reporting period:';

export function buildRirTemplatesV2(): RirTemplateBodies {
  const digest = buildBody({
    greeting: 'Dear {{leadName}},',
    intro: V2_DEVELOPER_INTRO,
    spHeader: V2_SP_HEADER,
    withDeveloperColumn: false,
    tail: V2_TAIL,
  });
  const melia = buildBody({
    greeting:
      'Dear MELIA focal point(s) of {{spCode}}{{#if spName}} – {{spName}}{{/if}},',
    intro:
      'The CGIAR Performance and Results Management System (PRMS) shows that {{resultCount}} innovation(s) of your Program/Accelerator, reported in previous years, have no update yet for the {{phaseYear}} reporting period, and no innovation developer listed on them can be reached through PRMS. Please follow up with the teams concerned:',
    spHeader: V2_SP_HEADER,
    withDeveloperColumn: true,
    tail: V2_TAIL,
  });
  const center = buildBody({
    greeting: 'Dear Center MEL focal point(s) of {{centerName}},',
    intro:
      'The CGIAR Performance and Results Management System (PRMS) shows that your center has {{resultCount}} innovation(s), reported in previous years, with no update yet to reflect any work done on them during the {{phaseYear}} reporting period:',
    spHeader: V2_SP_HEADER,
    withDeveloperColumn: false,
    tail: V2_TAIL,
  });
  return {
    [RIR_Q4_TEMPLATE_NAME]: digest,
    [RIR_FINAL_TEMPLATE_NAME]: digest,
    [RIR_MELIA_TEMPLATE_NAME]: melia,
    [RIR_CENTER_TEMPLATE_NAME]: center,
  };
}

// ---------------------------------------------------------------------------------------
// v3 (SR-167303, copy of 2026-11-25; design.md section 6.5)
// ---------------------------------------------------------------------------------------

const V3_DEVELOPER_TAIL = `
<p>For existing innovations that received active investment in {{phaseYear}}, you only need to update what has changed. All other existing data will be pre-filled for you to review, so this should not take much of your time.</p>

<p>For existing innovations that did not receive investment in {{phaseYear}}, or were stopped or put on hold, you can set the status to 'Inactive' and give the reason for discontinuation.</p>

<p>If you reported breeding lines or varieties as innovations in previous years, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their {{phaseYear}} update in PRMS and will contact you directly if she has any questions.</p>

<p>If you do not update your innovation results, PRMS will automatically close them with the status 'Inactive – not updated' at the end of January {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}}, {{nextNextYear}} and beyond).</p>

<p>This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.</p>

${DISCLAIMER}

${SHELL_CLOSE}`;

const V3_CENTER_TAIL = `
<p>If your Center reported breeding lines or varieties as innovations in {{previousYear}}, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their {{phaseYear}} update in PRMS and will contact you or the relevant teams directly if she has any questions.</p>

<p>For the innovations listed above that received active investment in {{phaseYear}}, you only need to update what has changed. All other existing data will be pre-filled for you to review, so the update should not take much time.</p>

<p>For listed innovations that did not receive investment in {{phaseYear}}, or were stopped or put on hold, you can set the status to 'Inactive' and provide the reason for discontinuation.</p>

<p>If the innovations listed above are not updated, PRMS will automatically close them with the status 'Inactive – not updated' in mid-February {{nextYear}}. You can reopen and update an innovation in any later reporting phase ({{nextYear}}, {{nextNextYear}} and beyond).</p>

<p>Keeping these records updated helps CGIAR maintain current information on its innovations and monitor their progress over time. Thank you for your contribution to this process; it is much appreciated.</p>

${DISCLAIMER}

${SHELL_CLOSE}`;

export function buildRirTemplatesV3(): RirTemplateBodies {
  const digest = buildBody({
    greeting: 'Dear {{leadName}},',
    intro: V2_DEVELOPER_INTRO,
    spHeader: V2_SP_HEADER,
    withDeveloperColumn: false,
    tail: V3_DEVELOPER_TAIL,
  });
  const melia = buildBody({
    greeting:
      'Dear MELIA focal point(s) of {{spCode}}{{#if spName}} – {{spName}}{{/if}},',
    intro: V2_DEVELOPER_INTRO,
    spHeader: V2_SP_HEADER,
    withDeveloperColumn: true,
    tail: V3_DEVELOPER_TAIL,
  });
  const center = buildBody({
    greeting: 'Dear Center MEL focal point(s) of {{centerName}},',
    intro:
      'The CGIAR Performance and Results Management System (PRMS) shows that your Center has {{resultCount}} innovation(s) reported in {{previousYear}} that have not yet been updated to reflect any work undertaken during the {{phaseYear}} reporting period:',
    spHeader:
      'Science Program / Accelerator who has approved the result in {{previousYear}}',
    withDeveloperColumn: false,
    tail: V3_CENTER_TAIL,
  });
  return {
    [RIR_Q4_TEMPLATE_NAME]: digest,
    [RIR_FINAL_TEMPLATE_NAME]: digest,
    [RIR_MELIA_TEMPLATE_NAME]: melia,
    [RIR_CENTER_TEMPLATE_NAME]: center,
  };
}

// ---------------------------------------------------------------------------------------
// v4 (SR-167303, Nicoleta's answer of 2026-11-26): v3 without the breeding paragraph.
// B4T contacts the Centers about breeding lines and varieties itself, so no email mentions them.
// Everything else (intros, column header, dates, links) is v3, byte for byte.
// ---------------------------------------------------------------------------------------

/** The breeding paragraph of a v3 tail and the blank line after it. */
const BREEDING_PARAGRAPH =
  /<p>If (?:you|your Center) reported breeding lines[^]*?<\/p>\n\n/;

function withoutBreedingParagraph(body: string): string {
  const out = body.replace(BREEDING_PARAGRAPH, '');
  if (out === body) {
    // v3 is frozen, so this only fires if someone edits it; fail instead of shipping v3 as v4.
    throw new Error('RIR copy v4: breeding paragraph not found in the v3 body');
  }
  return out;
}

export function buildRirTemplatesV4(): RirTemplateBodies {
  const v3 = buildRirTemplatesV3();
  return Object.fromEntries(
    Object.entries(v3).map(([name, body]) => [
      name,
      withoutBreedingParagraph(body),
    ]),
  );
}

// ---------------------------------------------------------------------------------------
// v5 (SR-167303, Nicoleta's answer of 2026-11-27: "Pls make it 10 Feb in the email"): v4 with
// the exact closing date in the Center email. Only the Center tail mentions mid-February; the
// developer and MELIA bodies are v4, byte for byte.
// ---------------------------------------------------------------------------------------

const MID_FEBRUARY = 'in mid-February {{nextYear}}';
const TEN_FEBRUARY = 'on 10 February {{nextYear}}';

export function buildRirTemplatesV5(): RirTemplateBodies {
  const v4 = buildRirTemplatesV4();
  const center = v4[RIR_CENTER_TEMPLATE_NAME];
  const out = center.replace(MID_FEBRUARY, TEN_FEBRUARY);
  if (out === center) {
    // v4 is frozen, so this only fires if someone edits it; fail instead of shipping v4 as v5.
    throw new Error(
      'RIR copy v5: "mid-February" not found in the v4 Center body',
    );
  }
  return { ...v4, [RIR_CENTER_TEMPLATE_NAME]: out };
}
