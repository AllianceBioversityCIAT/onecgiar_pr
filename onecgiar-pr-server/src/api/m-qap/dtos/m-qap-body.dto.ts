export class MQAPBodyDto {
  link: string;
  include?: string[];
  exclude?: string[];

  public static fromHandle(handle: string): MQAPBodyDto {
    const body = new MQAPBodyDto();
    body.link = handle;
    return body;
  }

  public static toOnlyGetCGSpaceData(handle: string): MQAPBodyDto {
    const basicBody = MQAPBodyDto.fromHandle(handle);
    basicBody.include = ['cgiarRepository'];
    return basicBody;
  }
}
