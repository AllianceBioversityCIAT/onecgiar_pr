import { env } from 'process';

export const validationAttr = (obj: any, BASE: any) => {
  const keys = Object.keys(BASE);
  for (const iterator of keys) {
    if (
      obj[iterator] === undefined ||
      obj[iterator] === null ||
      obj[iterator] === ''
    ) {
      return false;
    }
  }
  return true;
};

export const isProduction = () => {
  const pv = env?.IS_PRODUCTION?.toLocaleLowerCase();
  return pv == 'true' || pv == '1' ? true : false;
};
