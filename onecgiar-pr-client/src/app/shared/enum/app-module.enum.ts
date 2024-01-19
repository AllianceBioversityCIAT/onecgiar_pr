import { ModuleTypeEnum } from './api.enum';

export class AppModuleEnum {
  static readonly REPORTING = new AppModuleEnum(ModuleTypeEnum.REPORTING, 1);
  static readonly IPSR = new AppModuleEnum(ModuleTypeEnum.IPSR, 2);

  private constructor(public readonly name: string, public readonly value: number) {}

  public static getFromName(name: string): AppModuleEnum | undefined {
    return (Object.values(this) as AppModuleEnum[]).find(n => n.name === name);
  }

  public static getFromValue(value: number): AppModuleEnum | undefined {
    return (Object.values(this) as AppModuleEnum[]).find(n => n.value === value);
  }
}
