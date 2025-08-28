import { Request, Response, NextFunction } from 'express';

export function apiVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const version = req.query.version;

  if (version) {
    req['apiVersion'] = version.toString().startsWith('v')
      ? version
      : `v${version}`;
  } else {
    req['apiVersion'] = '';
  }

  next();
}
