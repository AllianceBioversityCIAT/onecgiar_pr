import { v4 as uuidv4 } from 'uuid';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Actions } from '../dto/enumAction.const';
import { Result } from '../../../api/results/entities/result.entity';

export class LogsModel {
  public id: string;
  public action: Actions;
  public userId: number;
  public userFirstName?: string;
  public userLastName?: string;
  public onResult: Result;
  public onClass: string;
  public onMethod: string;
  public moreInfo?: string;
  public objBefore?: any;
  public objAfter?: any;

  constructor(
    action: Actions,
    user: TokenDto,
    onResult: Result,
    actionInfo?: { class?: string; method?: string },
    moreInfo?: string,
    objBefore?: any,
    objAfter?: any,
  ) {
    this.id = uuidv4();
    this.userId = user.id;
    this.userFirstName = user.first_name;
    this.userLastName = user.last_name;
    this.action = action;
    this.onResult = onResult;
    this.moreInfo = moreInfo;
    this.onClass = actionInfo.class;
    this.onMethod = actionInfo.method;
    this.objBefore = objBefore;
    this.objAfter = objAfter;
  }

  public getDataInsert(): any {
    return {
      id: { S: `${this.id}` },
      userData: {
        M: {
          userId: { N: `${this.userId}` },
          userFirstName: { S: `${this.userFirstName}` },
          userLastName: { S: `${this.userLastName}` },
        },
      },
      resultData: {
        M: {
          resultCode: { N: `${this.onResult.result_code}` },
          resultId: { N: `${this.onResult.id}` },
          versionId: { N: `${this.onResult.version_id}` },
          before: { M: this.creatAnyObject(this.objBefore) },
          after: { M: this.creatAnyObject(this.objAfter) },
        },
      },
      action: { S: `${this.action}` },
      systemData: {
        M: {
          onClass: { S: `${this.onClass}` },
          onMethod: { S: `${this.onMethod}` },
        },
      },
      moreInfo: { S: `${this.moreInfo}` },
      createDate: { S: `${new Date().toLocaleDateString()}` },
    };
  }

  creatAnyObject(obj: any) {
    if (!obj) return {};
    let temp: any = {};
    for (const key in obj) {
      if (typeof obj[key] == 'object') {
        temp = { ...temp, ...{ [key]: { M: this.creatAnyObject(obj[key]) } } };
      } else {
        temp = { ...temp, ...this.convertChanges(obj[key], key) };
      }
    }
    return temp;
  }

  convertChanges(data, key) {
    switch (typeof data) {
      case 'string':
        return { [key]: { S: data } };
      case 'number':
        return { [key]: { N: data } };
      case 'boolean':
        return { [key]: { BOOL: data } };
    }
  }
}
