export class CreateResultsPackageTocResultDto {
    result_innovation_package_id: number;
    contributing_initiatives: initiativeInterfaces[];
    contributing_np_projects: donorInterfaceToc[];
    contributing_center: centerInterfacesToc[];
    result_toc_result: resultToResultInterfaceToc;
    contributors_result_toc_result: resultToResultInterfaceToc[];
    impacts: ResultTocImpactsInterface[];
    pending_contributing_initiatives: shareResultRequestInterface[];

}

interface ResultTocImpactsInterface{
    id: number;
    name: string;
    description: string;
    target: targetTocInterface[];
    indicators: indicatorsTocInterface[];
}

interface targetTocInterface{
    targetId: number;
    target?: string;
}

interface indicatorsTocInterface{
    id: number;
    indicator_statement?: string;
}

interface initiativeInterfaces{
    id: number;
}

interface institutionsInterfaceToc{
    institutions_id: number;
}

interface donorInterfaceToc{
    funder_institution_id: number;
    grant_title: string;
    center_grant_id: string;
    lead_center_id: string;
}
interface centerInterfacesToc{
    code: string;
    primary?: boolean;
}

interface resultToResultInterfaceToc{
    result_package_toc_result_id?: number;
    toc_result_id?: number;
    action_area_outcome_id?: number;
    result_innovation_package_id: number;
    planned_result_packages: boolean;
    initiative_id: number;
}

interface shareResultRequestInterface{
    id:number;
    share_result_request_id: number;
    is_active: boolean;
}