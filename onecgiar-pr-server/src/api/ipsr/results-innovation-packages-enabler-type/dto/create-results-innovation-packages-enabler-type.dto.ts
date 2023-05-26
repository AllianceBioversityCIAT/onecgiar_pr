export class CreateResultsInnovationPackagesEnablerTypeDto {
    complementary_innovation_enabler_types_one:innovationEnabler[] = [];
    complementary_innovation_enabler_types_two:innovationEnabler[]= [];
    result_by_innovation_package_id:number;
}

export class innovationEnabler{
    complementary_innovation_enabler_types_id:number;   
}
