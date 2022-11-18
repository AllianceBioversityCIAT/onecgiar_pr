export class InnovationUseDto{
    public result_innovation_use_id?: number;
    public male_using: number;
    public female_using: number;
    public other: otherMeasuresInterface[];
}

interface otherMeasuresInterface{
    result_innovations_use_measure_id: number;
    unit_of_measure: string;
    quantity: number;
}