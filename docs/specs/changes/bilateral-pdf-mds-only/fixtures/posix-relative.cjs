// Windows-only shim (not repo code): app/[template]/page.tsx builds a dynamic import path from
// path.relative(<cwd>/app/templates, file); on Windows that yields backslashes and the import 404s.
// Only that exact call is rewritten to POSIX separators.
const p = require('path');
const orig = p.relative;
p.relative = (from, to) => {
  const r = orig(from, to);
  return /[\\/]app[\\/]templates$/.test(String(from)) ? r.replace(/\\/g, '/') : r;
};
