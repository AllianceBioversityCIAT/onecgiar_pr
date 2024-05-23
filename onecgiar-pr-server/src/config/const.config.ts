import 'dotenv/config';
import { env } from 'process';

export default {
  active_directory: {
    url: env.AD_URL,
    baseDN: env.AD_BASEDN,
    domain: env.AD_DOMAIN,
  },
};
