/**
 * P2-3145: public CLARISA glossary — the single place where CGIAR reporting terms are
 * defined. Hardcoded rather than read from `environment.footerUrls` because those files
 * are gitignored and generated per deployment, so a key added there would never reach the
 * servers. The URL is public and the same in every environment. If it ever needs to change
 * without a release, it belongs in the platform global variables like Terms and Conditions.
 */
export const CLARISA_GLOSSARY_URL = 'https://clarisa.cgiar.org/landing-page/glossary';
