import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';

@Injectable()
export class LoginUtil { 

    public async createJWToken(email: string, password: string){
/*
        const userRepository = getRepository(Users);
        let user: Users;
        // console.log(email,password)
            
        if (!(email && password)) {
          // throw new BaseError(
          //     'INVALID',
          //     HttpStatusCode.BAD_REQUEST,
          //     'Missing required fields: email or password.',
          //     true
          // );
          throw new BaseError(
            'Util Login',
            400,
            'Missing required fields: email or password.',
            false
          );
        }
        email = email.trim().toLowerCase();
        let cgiar_user = await userRepository.findOne({
          where: {email, is_cgiar: 1, is_active: true},
          relations: ['roles']
        });
        if (cgiar_user) {
          let is_cgiar = await validateAD(cgiar_user, password);
          if (is_cgiar) {
            user = cgiar_user;
          }
        } else {
          user = await userRepository.findOne({
            where: {email, is_active: true},
            relations: ['roles']
          });
          if (!user) {
            // throw new BaseError(
            //     'NOT_FOUND',
            //     HttpStatusCode.NOT_FOUND,
            //     'User not found.',
            //     true
            // );
            throw new BaseError('Util Login', 400, 'User not found.', false);
          }
        }
    
        // check password
        if (!cgiar_user && !user.checkPassword(password)) {
          // throw new BaseError(
          //     'NOT FOUND',
          //     HttpStatusCode.NOT_FOUND,
          //     'User password incorrect.',
          //     true
          // );
        
          throw new BaseError(
            'Util Login',
            400,
            'The user or password is incorrect.',
            false
          );
        }
        user.last_login = new Date();
        user = await userRepository.save(user);
    
        const token = sign({userId: user.id, email: user.email}, jwtSecret, {
          expiresIn: '7h'
        });
        const name = user.first_name + ' ' + user.last_name;
        const roles = user.roles;
        const id = user.id;

        const userTokenData: createJWTokenInterface = {
            token: '',
            userId: '',
            userName: '',
            userRoles: ''
        }
        return userTokenData;*/
    }

}
