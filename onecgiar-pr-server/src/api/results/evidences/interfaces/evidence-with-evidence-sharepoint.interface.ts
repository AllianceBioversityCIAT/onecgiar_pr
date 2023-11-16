import { EvidenceSharepoint } from '../entities/evidence-sharepoint.entity';
import { Evidence } from '../entities/evidence.entity';

export interface EvidenceWithEvidenceSharepoint extends Evidence {
  is_public_file: EvidenceSharepoint['is_public_file'];
  document_id: EvidenceSharepoint['document_id'];
}
