import request from 'supertest';
import { CreateFullUserDto } from 'src/auth/modules/user/dto/create-full-user.dto';
import { CreateResultDto } from 'src/api/results/dto/create-result.dto';

describe('Results Controller (e2e)', () => {
    let app = 'http://localhost:3400'
    let token: string;

    const createResultData: CreateResultDto = {
        "initiative_id": 20,
        "result_type_id": 1,
        "result_name": "Test creating a result",
        "handler": ""
    }

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

    // * Success fetch all results with valid token
    it('/api/results/get/all (GET)', async () => {
        return await request(app)
            .get('/api/results/get/all')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch all results with valid token:', res.text)
            });
    });

    // * Success fetch all results-roles by user ID
    it('/api/results/get/all/roles/<id> (GET)', async () => {
        return await request(app)
            .get('/api/results/get/all/roles/' + 1)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch all results-roles by user ID:', res.text)
            });
    });

    // * Success fetch result by result name
    it('/api/results/get/name/<id> (GET)', async () => {
        return await request(app)
            .get('/api/results/get/name/' + 'test')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch result by result name:', res.text)
            });
    });

    // ! Error create result without valid token
    it('/api/results/create/header (POST)', async () => {
        return await request(app)
            .post('/api/results/create/header')
            .send(createResultData)
            .set('Content-Type', 'application/json')
            .set('auth', '')
            .expect(401)
            .expect(res => {
                console.log('Error create result without valid token:', res.text)
            });
    });

    // ! Error create result without name
    it('/api/results/create/header (POST)', async () => {
        return await request(app)
            .post('/api/results/create/header')
            .send({
                "initiative_id": 30,
                "result_type_id": 2,
                "result_name": ""
            })
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(400)
            .expect(res => {
                console.log('Error create result without name:', res.text)
            });
    });

    // ! Error create result without a valid result type
    it('/api/results/create/header (POST)', async () => {
        return await request(app)
            .post('/api/results/create/header')
            .send({
                "initiative_id": 30,
                "result_type_id": 100,
                "result_name": "Test"
            })
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(404)
            .expect(res => {
                console.log('Error create result without a valid result type:', res.text)
            });
    });

    // * Success create result
    it('/api/results/create/header (POST)', async () => {
        return await request(app)
            .post('/api/results/create/header')
            .send(createResultData)
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(201)
            .expect(res => {
                console.log('Success create result:', res.text)
            });
    });
});