export class CreateResultGeoDto {
    public scope_id: number;
    public result_id!: number;
    public has_countries: boolean;
    public has_regions: boolean;
    public regions: geoScope[];
    public countries: geoScope[];
}

interface geoScope{
    id: number;
}
