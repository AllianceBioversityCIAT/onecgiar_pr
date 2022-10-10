import request from 'supertest';
import { UserLoginDto } from 'src/auth/dto/login-user.dto';

describe('Results Controller (e2e)', () => {
    let app = 'http://localhost:3400'
    const loginDataSuccess: UserLoginDto = {
        "email": "juan@gmail.com",
        "password": "12345678"
    };

    const loginDataIncomplete: UserLoginDto = {
        "email": "juan@gmail.com",
        "password": ""
    };

    const loginDataError: UserLoginDto = {
        "email": "jhon@cgiar.org",
        "password": "12345678"
    };

    // * Successfull complete login test
    it('/auth/singin (POST)', async () => {
        return await request(app)
            .post('/auth/singin')
            .send(loginDataSuccess)
            .set('Content-Type', 'application/json')
            .expect(202)
            .expect(res => {
                console.log('Successfull complete login test:', res.text)
            });
    });

    // * Error incomplete login test
    it('/auth/singin (POST)', async () => {
        return await request(app)
            .post('/auth/singin')
            .send(loginDataIncomplete)
            .set('Content-Type', 'application/json')
            .expect(400)
            .expect(res => {
                console.log('Error incomplete login test:', res.text)
            });
    });

    // * Error unregistered login test
    it('/auth/singin (POST)', async () => {
        return await request(app)
            .post('/auth/singin')
            .send(loginDataError)
            .set('Content-Type', 'application/json')
            .expect(400)
            .expect(res => {
                console.log('Error unregistered login test:', res.text)
            });
    });
})