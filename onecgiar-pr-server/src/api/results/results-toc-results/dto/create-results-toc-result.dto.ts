export class CreateResultsTocResultDto {
    result_id: number;
    contributing_initiatives: initiativeInterfaces[];
    contributing_np_projects: donorInterfaceToc[];
    contributing_center: centerInterfacesToc[];
    result_toc_result: resultToResultInterfaceToc;
    contributors_result_toc_result: contributorsResultToResultInterfaceToc[];

}

interface initiativeInterfaces{
    id: number;
}

interface institutionsInterfaceToc{
    institutions_id: number;
}

interface donorInterfaceToc{
    funder: institutionsInterfaceToc;
    grant_title: string;
    center_grant_id: string;
    lead_center: centerInterfacesToc;
}
interface centerInterfacesToc{
    code: string;
    primary?: boolean;
}

interface resultToResultInterfaceToc{
    toc_result_id?: number;
    outcome_id?: number;
    results_id: number;
    planned_result: boolean;
}

interface contributorsResultToResultInterfaceToc{
    result_toc_result: resultToResultInterfaceToc;
}
