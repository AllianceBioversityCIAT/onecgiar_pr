export class LinksToResultsBody {
  public links: interfaceLinkResults[] = [];
  public legacy_link: interfaceLinkResults[] = [];
}

interface interfaceLinkResults {
  id?: number;
  legacy_link?: string;
  result_type?: string;
  title?: string;
}
