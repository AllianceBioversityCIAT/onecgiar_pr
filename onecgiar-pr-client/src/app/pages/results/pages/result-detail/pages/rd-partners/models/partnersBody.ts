export class PartnersBody {
  public no_applicable_partner: boolean = false;
  public institutions: InstitutionsInterface[] = [];
  constructor(no_applicable_partner?) {
    this.no_applicable_partner = no_applicable_partner ? no_applicable_partner : false;
  }
}

class InstitutionsInterface {
  // mapped_mqap_institutions: number | string = null;
  institutions_id: number;
  institutions_name: string;
  institutions_type_name: string;
  deliveries?: boolean[] = [false, false, false];
}
