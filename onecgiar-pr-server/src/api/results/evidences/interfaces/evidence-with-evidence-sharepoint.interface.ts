import { EvidenceSharepoint } from '../entities/evidence-sharepoint.entity';
import { Evidence } from '../entities/evidence.entity';

export interface EvidenceWithEvidenceSharepoint extends Evidence {
  is_public_file: EvidenceSharepoint['is_public_file'];
  document_id: EvidenceSharepoint['document_id'];
  /** P2-3824: read from `result_ip_step_three_evidence` (IPSR Step 3 rows only). */
  result_by_innovation_package_id?: number | string;
  /** P2-3824: `readiness` | `use`, from `result_ip_step_three_evidence`. */
  ipsr_evidence_level?: string;
}
