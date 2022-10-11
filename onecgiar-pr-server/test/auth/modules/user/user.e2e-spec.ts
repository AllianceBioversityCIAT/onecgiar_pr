import request from 'supertest';
import { CreateFullUserDto } from 'src/auth/modules/user/dto/create-full-user.dto';

describe('Results Controller (e2e)', () => {
    let app = 'http://localhost:3400'
    let token: string;

    const createDataSuccess: CreateFullUserDto = {
        userData: {
            "first_name": "Kyle",
            "last_name": "Wilson",
            "email": "k.wilson@cgiar.org",
            "password": "12345678",
            "created_by": 1,
            "last_updated_by": 1,
            "is_cgiar": true
        },
        role: 1
    };

    // * Successfull login test & obtaine the token
    it('/auth/singin (POST)', async () => {
        const createUser = await request(app)
            .post('/auth/singin')
            .send({
                'email': 'juan@gmail.com',
                'password': '12345678'
            })
            .set('Content-Type', 'application/json')
            .expect(202)
        
        console.log('Successfully login to take the token', createUser.body.response.token);    
        token = createUser.body.response.token;
    });

    // * Error to create user without valid token
    it('/auth/user/create (POST)', async () => {
        return await request(app)
            .post('/auth/user/create')
            .send(createDataSuccess)
            .set('Content-Type', 'application/json')
            .set('auth', '')
            .expect(401)
            .expect(res => {
                console.log('Error to create user without token test:', res.text)
            });
    });

    // * Successfull create user
    it('/auth/user/create (POST)', async () => {
        return await request(app)
            .post('/auth/user/create')
            .send(createDataSuccess)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(201)
            .expect(res => {
                console.log('Successfull create user test:', res.text)
            });
    });

    // * Incomplete data to create user
    it('/auth/user/create (POST)', async () => {
        return await request(app)
            .post('/auth/user/create')
            .send({
                userData: {
                    "first_name": "",
                    "last_name": "",
                    "email": "c.adams@gmail.com",
                },
                role: 1
            })
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(400)
            .expect(res => {
                console.log('Incomplete user test:', res.text)
            });
    });

    // * Duplicate data to create user
    it('/auth/user/create (POST)', async () => {
        return await request(app)
            .post('/auth/user/create')
            .send(createDataSuccess)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(400)
            .expect(res => {
                console.log('Duplicate user test:', res.text)
            });
    });

    // * Success fetch all users
    it('/auth/user/get/all (GET)', async () => {
        return await request(app)
            .get('/auth/user/get/all')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch all users test:', res.text)
            });
    });

    // * Success fetch user by ID
    it('/auth/user (GET)', async () => {
        return await request(app)
            .get('/auth/user/' + 2)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch user by ID test:', res.text)
            });
    });

    // * Success fetch user by Email
    it('/auth/user/get/all (GET)', async () => {
        return await request(app)
            .get('/auth/user/get/all/' + 'juan@gmail.com')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch user by Email test:', res.text)
            });
    });

    // * Success fetch user by Email
    it('/auth/user/get/all (GET)', async () => {
        return await request(app)
            .get('/auth/user/get/all/' + 'juan@gmail.com')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch user by ID test:', res.text)
            });
    });

    // * Success fetch initiatives by user ID
    it('/auth/user/get/initiative (GET)', async () => {
        return await request(app)
            .get('/auth/user/get/initiative/' + 1)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch initiatives by user ID:', res.text)
            });
    });
});