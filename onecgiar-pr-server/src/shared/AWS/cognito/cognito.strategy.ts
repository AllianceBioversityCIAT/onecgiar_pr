import { HttpService } from '@nestjs/axios';
import { Request } from 'express';
import {
  BadRequestException,
  Injectable,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { firstValueFrom, map } from 'rxjs';
import { ExceptionMessage } from '../enum/exception-message.enum';
import { AWSutil } from '../utils/aws.utils';
import { ResponseCognitoDto } from './dto/cognito-config.dto';
import { CognitoProfileDto } from './dto/cognito-profile.dto';

/**
 * @description - This class is responsible for the strategy to be used for
 * the AWS Cognito service
 * @class CognitoStrategy
 * @extends {PassportStrategy(Strategy, 'cognito')}
 * @constructor - This class is responsible for the strategy to be used for
 * the AWS Cognito service
 * @param _http - The HttpService instance
 * @param _configService - The ConfigService instance
 * @method validate - This method is responsible for validating the user's access
 * token and getting the user's profile data from the AWS Cognito service
 * @method _createToken - This method is responsible for creating the token for the
 * user to be able to access the application
 * @method _getProfileData - This method is responsible for getting the user's profile data
 * from the AWS Cognito service
 */
@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, 'cognito') {
  constructor(private readonly _http: HttpService) {
    super();
  }

  /**
   *
   * @param req - The request object from the user
   * @returns {Promise<CognitoProfileDto>} - Returns the user's profile data from
   * the AWS Cognito service
   * @description - This method is responsible for validating the user's access
   * token and getting the user's profile data from the AWS Cognito service
   */
  async validate(@Req() req: Request) {
    const { authorization: authV1, Authorization: authV2 } = req.headers;
    const authorization = authV1 || authV2;
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Bearer token is incorrect type');
    }

    // Split the authorization header to get the code from the user
    // to be able to get the access token
    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Bearer token is missing');
    }
    const code = parts[1];

    const config = AWSutil.cognito.config({
      client_id: process.env.COGNITO_ACCESS_KEY,
      client_secret: process.env.COGNITO_SECRET_ACCESS_KEY,
      code: code,
      redirect_uri: process.env.COGNITO_REDIRECT_URI,
    });

    const accessToken = await this._createToken(config);
    const profileData = await this._getProfileData(accessToken);

    return profileData;
  }

  /**
   *
   * @param config - The configuration for the request to be made to the AWS
   * Cognito service
   * @returns {Promise<string>} - Returns the access token
   * @description - This method is responsible for creating the token for the
   * user to be able to access the application
   */
  private _createToken(config: ResponseCognitoDto): Promise<string> {
    return firstValueFrom(
      this._http
        .post(
          `${process.env.COGNITO_LINK}/oauth2/token`,
          config.body,
          config.headers,
        )
        .pipe(
          map((res: { data: { access_token: string } }) => {
            if (!res?.data?.access_token) {
              throw new UnauthorizedException(
                ExceptionMessage.AWS_AUTHORIZATION_CODE,
              );
            }
            return res.data.access_token;
          }),
        ),
    ).catch((err) => {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new BadRequestException(err?.response?.data);
    });
  }

  /**
   *
   * @param accessToken - The access token to be used to get the user's profile data
   * @returns {Promise<CognitoProfileDto>} - Returns the user's profile data from
   * the AWS Cognito service
   * @description - This method is responsible for getting the user's profile data
   * from the AWS Cognito service
   */
  private _getProfileData(accessToken: string): Promise<CognitoProfileDto> {
    return firstValueFrom(
      this._http
        .get(`${process.env.COGNITO_LINK}/oauth2/userInfo`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .pipe(
          map((res: { data: CognitoProfileDto }) => {
            console.log("🚀 ~ CognitoStrategy ~ map ~ res:", res)
            if (!res?.data) {
              throw new UnauthorizedException(
                ExceptionMessage.AWS_AUTHORIZATION_CODE,
              );
            }
            const { data } = res;
            return data;
          }),
        ),
    ).catch((err) => {
      throw new BadRequestException(err);
    });
  }
}
