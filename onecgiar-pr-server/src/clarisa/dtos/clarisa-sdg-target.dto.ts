export class ClarisaSdgTargetDto {
  id: number;
  sdgTarget: string;
  sdgTargetCode: string;
  sdg: ClarisaSdgDto;
}

export class ClarisaSdgDto {
  financialCode: string;
  fullName: string;
  shortName: string;
  usndCode: number;
}
