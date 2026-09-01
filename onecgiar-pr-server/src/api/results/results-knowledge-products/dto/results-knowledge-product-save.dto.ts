export class ResultsKnowledgeProductSaveDto {
  isMeliaProduct: boolean;
  ostSubmitted: boolean;
  ostMeliaId: number;
  /** `undefined` = not sent, leave the stored study alone. `null` = clear it. */
  tocMeliaStudyId?: string | null;
  clarisaMeliaTypeId: number;
}
