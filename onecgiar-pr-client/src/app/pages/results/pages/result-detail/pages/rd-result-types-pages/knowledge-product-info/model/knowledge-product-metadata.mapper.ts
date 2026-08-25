import chroma from 'chroma-js';

import { FairSpecificData, FullFairData, KnowledgeProductBody } from './knowledgeProductBody';
import { KnowledgeProductBodyMapped } from './KnowledgeProductBodyMapped';

/**
 * Response → view mapping of the Knowledge Product section, shared by the W1/W2 section and the
 * bilateral one.
 *
 * It lives outside both components on purpose. P2-3384 asks the bilateral section to behave like
 * the W1/W2 one, and the only way to keep that true is to run the same code: a copy would agree on
 * the day it was written and drift on the first fix applied to one of them. Everything here is
 * pure — response in, view model out — so neither flow's services leak into the other.
 */

export type FairDimension = { key: string; value: FairSpecificData };

const KP_GRADIENT_SCALE = chroma.scale(['#f44444', '#dcdf38', '#38df7b']).mode('hcl');

/** Inner fill of a FAIR radial: the scale colour, brightened. */
export function fairInnerColor(value: number): string {
  return KP_GRADIENT_SCALE(value).brighten().hex();
}

/** Ring colour of a FAIR radial. */
export function fairBorderColor(value: number): string {
  return KP_GRADIENT_SCALE(value).hex();
}

/**
 * One entry per FAIR dimension, with `total_score` dropped — it is a number, not a dimension, and
 * rendering it would paint a fifth radial with no sub-indicators.
 *
 * Tolerates a missing object: the bilateral payload can arrive without `fair_data`, and
 * `Object.keys(undefined)` throws.
 */
export function splitFairDimensions(fairObject: FullFairData | null | undefined): FairDimension[] {
  return Object.keys(fairObject ?? {})
    .filter(key => key != 'total_score')
    .map(key => ({ key, value: fairObject[key] }));
}

/**
 * `null` reads differently depending on the type: for a Journal Article the field is expected and
 * its absence is something the user must fix at the source ("Not provided", which drives the inline
 * guidance messages), whereas for any other type it was never expected ("Not available").
 */
function transformBoolean(value: boolean, isJA?: boolean): string {
  if (value == null) {
    return isJA ? 'Not provided' : 'Not available';
  }

  return value ? 'Yes' : 'No';
}

function readCGSpaceMetadata(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody, isJA: boolean): void {
  mapped.is_peer_reviewed_CG = transformBoolean(response.metadataCG?.is_peer_reviewed);
  mapped.is_isi_CG = transformBoolean(response.metadataCG?.is_isi, isJA);
  let accessibilityCG: string;

  if (response.metadataCG?.open_access) {
    accessibilityCG = response.metadataCG.open_access;
  } else if (response.metadataCG?.accessibility == null) {
    accessibilityCG = isJA ? 'Not provided' : 'Not available';
  } else {
    accessibilityCG = response.metadataCG.accessibility ? 'Open Access' : 'Limited Access';
  }

  mapped.accessibility_CG = accessibilityCG;
  mapped.yearCG = response.metadataCG?.issue_year;
}

function readWoSMetadata(mapped: KnowledgeProductBodyMapped, response: KnowledgeProductBody): void {
  mapped.is_peer_reviewed_WOS = transformBoolean(response.metadataWOS?.is_peer_reviewed);
  mapped.is_isi_WOS = transformBoolean(response.metadataWOS?.is_isi);
  mapped.accessibility_WOS = response.metadataWOS?.accessibility ? 'Open Access' : 'Limited Access';
  mapped.year_WOS = response.metadataWOS?.issue_year;
}

/**
 * The handle is stored bare and the browsable url depends on which repository holds it. An
 * unrecognised source leaves the handle unset rather than building a url that would 404.
 */
function resolveHandleUrl(source: string, handle: string): string | undefined {
  if (source === 'CGSpace') return `https://cgspace.cgiar.org/handle/${handle}`;
  if (source === 'MELSpace') return `https://repo.mel.cgiar.org/handle/${handle}`;
  if (source === 'WorldFish DSpace') return `https://hdl.handle.net/${handle}`;
  return undefined;
}

export function mapKnowledgeProductBody(response: KnowledgeProductBody): {
  mapped: KnowledgeProductBodyMapped;
  fairData: FairDimension[];
} {
  const mapped = new KnowledgeProductBodyMapped();
  mapped.warnings = response.warnings;

  mapped.authors = response.authors?.map(m => m.name);
  mapped.type = response.type;
  mapped.doi = response.metadataCG?.doi;
  mapped.licence = response.licence;
  mapped.keywords = (response.keywords ?? []).join('; ');
  mapped.agrovoc_keywords = (response.agrovoc_keywords ?? []).join('; ');
  mapped.commodity = response.commodity;
  mapped.investors = response.sponsor;
  mapped.altmetric_details_url = response.altmetric_detail_url;
  mapped.altmetric_img_url = response.altmetric_image_url;
  mapped.references = response.references_other_knowledge_products;
  mapped.onlineYearCG = response.metadataCG?.online_year;
  const sourceFromMetadata = response.metadata?.find(m => m?.source)?.source;
  mapped.source = response.metadataCG?.source ?? sourceFromMetadata ?? response.repo ?? 'Unknown';

  const handleUrl = resolveHandleUrl(mapped.source, response.handle);
  if (handleUrl) mapped.handle = handleUrl;

  const fairData = splitFairDimensions(response.fair_data);

  const journalArticle: boolean = (response.type ?? '').toLocaleLowerCase().includes('journal article');
  mapped.isJournalArticle = journalArticle;
  if (journalArticle) {
    // WoS metadata only exists for a Journal Article that carries a DOI; the repository fields are
    // read either way, so a missing DOI still fills the section.
    if (response.metadataCG?.doi && response.metadataWOS) {
      readWoSMetadata(mapped, response);
    }
    readCGSpaceMetadata(mapped, response, journalArticle);
  } else if (response.metadataCG?.issue_year == response.cgspace_phase_year) {
    // Other types are only read when the repository record belongs to the phase being reported —
    // otherwise the section would show metadata from a different year's record.
    readCGSpaceMetadata(mapped, response, journalArticle);
  }

  return { mapped, fairData };
}
