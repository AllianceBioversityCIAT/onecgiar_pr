import { Injectable, Logger } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoConfigDto,
  ResponseCognitoDto,
} from '../cognito/dto/cognito-config.dto';

export class AWSutil {
  public static readonly cognito = {
    config: (config: CognitoConfigDto): ResponseCognitoDto => {
      return {
        body: new URLSearchParams({
          ...config.moreoptions?.body,
          grant_type: config?.grant_type || 'authorization_code',
          client_id: config.client_id,
          client_secret: config.client_secret,
          code: config.code,
          redirect_uri: config.redirect_uri,
        })?.toString(),
        headers: {
          auth: {
            username: config.client_id,
            password: config.client_secret,
          },
          headers: {
            ...config.moreoptions?.headers,
            'Content-Type':
              config.moreoptions?.headers?.['Content-Type'] ||
              'application/x-www-form-urlencoded',
          },
        },
      };
    },
  };
}

@Injectable()
export class AWSUtilsService {
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.COGNITO_REGION,
      credentials: {
        accessKeyId: process.env.COGNITO_ACCESS_KEY,
        secretAccessKey: process.env.COGNITO_SECRET_ACCESS_KEY,
      },
    });
  }

  async createNewUser(user: AWSNewUser, customPassword?: boolean) {
    function generateTempPassword(length = 8): string {
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      const symbols = '!@#$%^&*';

      const allChars = upper + lower + digits + symbols;
      const getRandom = (str: string) =>
        str.charAt(Math.floor(Math.random() * str.length));

      let password =
        getRandom(upper) +
        getRandom(lower) +
        getRandom(digits) +
        getRandom(symbols);

      for (let i = password.length; i < length; i++) {
        password += getRandom(allChars);
      }

      password = password
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('');
      console.log('Contraseña:', password);

      return password;
    }

    const userPoolId = process.env.COGNITO_POOL_ID;
    const username = user.email;

    try {
      // Verificar si el usuario ya existe
      const checkUserCommand = new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(checkUserCommand);

      console.log(`[INFO] Usuario existente en AWS Cognito: ${username}`);
      if (customPassword) {
        const tempPassword = generateTempPassword();
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: username,
          Password: tempPassword,
          Permanent: true,
        });

        await this.cognitoClient.send(setPasswordCommand);

        return {
          message: 'Usuario existente, contraseña actualizada',
          email: user.email,
          password: tempPassword,
        };
      } else {
        return {
          email: user.email,
        };
      }
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: process.env.COGNITO_POOL_ID,
          Username: user.email,
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'name', Value: user.firstName },
            { Name: 'family_name', Value: user.lastName },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        });

        try {
          await this.cognitoClient.send(createUserCommand);
          console.log('[SIMULACIÓN] Usuario creado en Cognito:', user.email);

          if (customPassword) {
            const tempPassword = generateTempPassword();
            const setPasswordCommand = new AdminSetUserPasswordCommand({
              UserPoolId: process.env.COGNITO_POOL_ID,
              Username: user.email,
              Password: tempPassword,
              Permanent: true,
            });

            await this.cognitoClient.send(setPasswordCommand);

            return {
              email: user.email,
              password: tempPassword,
            };
          } else {
            return {
              email: user.email,
            };
          }
        } catch (error) {
          throw error;
        }
      }
    }
  }
}

export class AWSNewUser {
  public email: string;
  public firstName: string;
  public lastName: string;
}
