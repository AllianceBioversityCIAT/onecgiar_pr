import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenDto } from '../globalInterfaces/token.dto';

export const UserToken = createParamDecorator(
  (authParameter = 'auth', ctx: ExecutionContext): TokenDto => {
    const request = ctx.switchToHttp().getRequest();
    const headerValue = request.headers[authParameter];
    // process the header value and return a usable object
    const user = processUserToken(headerValue);
    return user;
  },
);

export const DecodedUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

function processUserToken(headerValue: string): TokenDto {
  const token: TokenDto = <TokenDto>(
    JSON.parse(Buffer.from(headerValue.split('.')[1], 'base64').toString())
  );
  return token;
}
