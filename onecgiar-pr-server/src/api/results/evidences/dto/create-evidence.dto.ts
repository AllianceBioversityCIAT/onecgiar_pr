export class CreateEvidenceDto {
    public result_id: number;
    public evidences: evidencesCreateInterface[];
    public supplementary: evidencesCreateInterface[];
}

interface evidencesCreateInterface{
    link: string;
    description?: string;
    gender_related?: boolean;
    youth_related?: boolean;
}
