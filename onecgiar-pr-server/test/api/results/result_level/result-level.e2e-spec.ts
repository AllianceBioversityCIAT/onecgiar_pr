import request from 'supertest';

describe('Result Levels Controller (e2e)', () => {
    let app = 'http://localhost:3400'
    let token: string;
    
    // * Successfull login test & obtaine the token
    it('/auth/singin (POST)', async () => {
        const createUser = await request(app)
            .post('/auth/singin')
            .send({
                'email': 'juan@gmail.com',
                'password': '1234567'
            })
            .set('Content-Type', 'application/json')
            .expect(202)

        console.log('Successfully login to take the token', createUser.body.response.token);
        token = createUser.body.response.token;
    });

    // * Success fetch all results levels with valid token
    it('/api/results/result-levels/all (GET)', async () => {
        return await request(app)
            .get('/api/results/result-levels/all')
            .set('Content-Type', 'application/json')
            .set('auth', token)
            .expect(200)
            .expect(res => {
                console.log('Success fetch all results levels with valid token:', res.text)
            });
    });
});