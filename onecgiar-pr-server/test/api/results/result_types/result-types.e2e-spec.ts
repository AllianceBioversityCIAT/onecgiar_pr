import request from 'supertest';

describe('Result Type Controller (e2e)', () => {
  const app = 'http://localhost:3400';
  let token: string;

  // * Successfull login test & obtaine the token
  it('/auth/singin (POST)', async () => {
    const createUser = await request(app)
      .post('/auth/singin')
      .send({
        email: 'juan@gmail.com',
        password: '1234567',
      })
      .set('Content-Type', 'application/json')
      .expect(202);

    console.log(
      'Successfully login to take the token',
      createUser.body.response.token,
    );
    token = createUser.body.response.token;
  });

  // * Success fetch all result types types with valid token
  it('/api/results/result-types/all (GET)', async () => {
    return await request(app)
      .get('/api/results/result-types/all')
      .set('Content-Type', 'application/json')
      .set('auth', token)
      .expect(200)
      .expect((res) => {
        console.log(
          'Success fetch all result types with valid token:',
          res.text,
        );
      });
  });

  // ! Error fetch all result types without valid token
  it('/api/results/result-types/all (GET)', async () => {
    return await request(app)
      .get('/api/results/result-types/all')
      .set('Content-Type', 'application/json')
      .set('auth', '')
      .expect(401)
      .expect((res) => {
        console.log(
          'Error fetch all result types without valid token:',
          res.text,
        );
      });
  });

  // * Success fetch a result types by ID
  it('/api/results/result-types/<id> (GET)', async () => {
    return await request(app)
      .get('/api/results/result-types/' + 3)
      .set('Content-Type', 'application/json')
      .set('auth', token)
      .expect(200)
      .expect((res) => {
        console.log(' Success fetch a result types by ID:', res.text);
      });
  });
});
