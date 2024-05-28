import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { env } from 'process';

const ddbClient = new DynamoDBClient({
  region: env.DYNAMO_REGION,
  credentials: {
    accessKeyId: env.DYNAMO_KEY,
    secretAccessKey: env.DYNAMO_SECRET_KEY,
  },
});
export { ddbClient };
