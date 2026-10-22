import { scopeState, mergeScopedState } from './server/warehouse-inventory.js';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  monthEnd,
  viewPreferences,
  audit,
  transfers,
  deliveries,
  createSession,
  databasePath,
  deleteSession,
  getAuthStatus,
  readState,
  sessionUser,
  setupAdministrator,
  verifyCredentials,
  writeState,
} from './server/database.js';
import { assertApprovedQuotationRules } from './server/quotation-rules.js';
import { assertRoleStateChange } from './server/role-permissions.js';
import { assertPaymentChanges } from './server/payment-rules.js';
import { hasPermission } from './js/core/permissions.js';

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const SESSION_COOKIE = 'gromex_session';
const TEMPORARY_SESSION_MS = 12 * 60 * 60 * 1000;
const PERSISTENT_SESSION_MS = 90 * 24 * 60 * 60 * 1000;
const loginAttempts = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const parseCookies = (request) =>
  Object.fromEntries(
    String(request.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        return separator < 0
          ? [part, '']
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );

const cookieHeader = (request, token, persistent = false) => {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Strict', 'Path=/'];
  if (persistent) parts.push(`Max-Age=${Math.floor(PERSISTENT_SESSION_MS / 1000)}`);
  if (request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https') parts.push('Secure');
  return parts.join('; ');
};

const clearCookieHeader = (request) =>
  `${cookieHeader(request, '', false)}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

const authenticatedSession = (request) => sessionUser(parseCookies(request)[SESSION_COOKIE]);

const loginRateLimited = (request) => {
  const key = request.socket.remoteAddress || 'local';
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, since: now };
  if (now - record.since > 10 * 60 * 1000) {
    loginAttempts.set(key, { count: 0, since: now });
    return false;
  }
  return record.count >= 8;
};

const recordFailedLogin = (request) => {
  const key = request.socket.remoteAddress || 'local';
  const now = Date.now();
  const record = loginAttempts.get(key);
  loginAttempts.set(
    key,
    !record || now - record.since > 10 * 60 * 1000
      ? { count: 1, since: now }
      : { ...record, count: record.count + 1 },
  );
};

const clearLoginAttempts = (request) => loginAttempts.delete(request.socket.remoteAddress || 'local');

const startSession = (request, response, user, remember) => {
  const duration = remember ? PERSISTENT_SESSION_MS : TEMPORARY_SESSION_MS;
  const token = createSession(user.id, remember, Date.now() + duration);
  response.setHeader('Set-Cookie', cookieHeader(request, token, remember));
  sendJson(response, 200, { authenticated: true, user, persistent: remember });
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('El cuerpo de la solicitud supera el límite permitido.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('El contenido JSON no es válido.'));
      }
    });
    request.on('error', reject);
  });

const publicFile = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\//, '');
  const allowed =
    ['index.html', 'app.js', 'styles.css', 'auth.css', 'favicon.ico'].includes(relativePath) ||
    relativePath.startsWith('js/') ||
    relativePath.startsWith('assets/');

  if (!allowed) return null;

  const resolved = path.resolve(PROJECT_DIR, relativePath);
  return resolved.startsWith(`${PROJECT_DIR}${path.sep}`) ? resolved : null;
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  try {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    if (url.pathname.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');

    if (url.pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { ok: true, database: path.basename(databasePath) });
      return;
    }

    if (url.pathname === '/api/auth/status' && request.method === 'GET') {
      const auth = authenticatedSession(request);
      const status = getAuthStatus();
      sendJson(response, 200, {
        authenticated: Boolean(auth),
        user: auth?.user || null,
        persistent: auth?.persistent || false,
        ...status,
      });
      return;
    }

    if (url.pathname === '/api/auth/setup' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const user = setupAdministrator(body);
      startSession(request, response, user, Boolean(body.remember));
      return;
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      if (loginRateLimited(request)) {
        sendJson(response, 429, { error: 'Demasiados intentos. Espera 10 minutos e inténtalo de nuevo.' });
        return;
      }
      const body = await readJsonBody(request);
      const user = verifyCredentials(body.username, body.password);
      if (!user) {
        recordFailedLogin(request);
        sendJson(response, 401, { error: 'Nombre de usuario o contraseña incorrectos.' });
        return;
      }
      clearLoginAttempts(request);
      startSession(request, response, user, Boolean(body.remember));
      return;
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      deleteSession(parseCookies(request)[SESSION_COOKIE]);
      response.setHeader('Set-Cookie', clearCookieHeader(request));
      sendJson(response, 200, { authenticated: false });
      return;
    }

    const auth = url.pathname.startsWith('/api/') ? authenticatedSession(request) : null;
    if (url.pathname.startsWith('/api/') && !auth) {
      sendJson(response, 401, { error: 'Debes iniciar sesión para continuar.' });
      return;
    }

    if (url.pathname === '/api/transfers' || url.pathname.startsWith('/api/transfers/')) {
      const state=readState(auth.user.id), user=auth.user;
      if (url.pathname === '/api/transfers/monthly' && request.method === 'GET') {
        sendJson(response,200,transfers.monthly(user,state,url.searchParams.get('month'))); return;
      }
      if (url.pathname === '/api/transfers' && request.method === 'GET') {
        sendJson(response,200,transfers.list(user,state,Object.fromEntries(url.searchParams))); return;
      }
      if (url.pathname === '/api/transfers' && request.method === 'POST') {
        const body=await readJsonBody(request), fresh=authenticatedSession(request);
        if (!fresh) { sendJson(response,401,{error:'La sesión terminó.'});return; }
        sendJson(response,201,transfers.create(fresh.user,readState(fresh.user.id),body)); return;
      }
      const action=url.pathname.match(/^\/api\/transfers\/([^/]+)\/(accept|cancel|edit)$/);
      if (action && request.method === 'POST') {
        const body=await readJsonBody(request);
        // Re-read after the asynchronous body read so stock and permissions are current.
        const fresh=authenticatedSession(request);
        if (!fresh) { sendJson(response,401,{error:'La sesión terminó.'});return; }
        const live=readState(fresh.user.id);
        sendJson(response,200,transfers[action[2]==='accept'?'process':action[2]](fresh.user,live,action[1],body));return;
      }
    }
    const deliveryRoute=url.pathname.match(/^\/api\/sales\/([^/]+)\/deliveries$/);
    if (deliveryRoute && request.method==='POST') {
      const body=await readJsonBody(request),fresh=authenticatedSession(request);
      if (!fresh) {sendJson(response,401,{error:'La sesión terminó.'});return;}
      sendJson(response,200,deliveries.register(fresh.user,decodeURIComponent(deliveryRoute[1]),body));return;
    }
    if (url.pathname === '/api/reports/month-end' && request.method==='GET') {
      const month=url.searchParams.get('month');sendJson(response,200,url.searchParams.has('preview')?monthEnd.preview(auth.user,month):monthEnd.list(auth.user,month));return;
    }
    if (url.pathname === '/api/reports/month-end' && request.method==='POST') {
      const body=await readJsonBody(request),fresh=authenticatedSession(request);if(!fresh){sendJson(response,401,{error:'La sesión terminó.'});return;}
      sendJson(response,201,monthEnd.save(fresh.user,body.month,body));return;
    }
    const closingRoute=url.pathname.match(/^\/api\/reports\/month-end\/([^/]+)(\/review)?$/);
    if(closingRoute && request.method==='GET' && !closingRoute[2]){sendJson(response,200,monthEnd.get(auth.user,closingRoute[1]));return;}
    if(closingRoute && request.method==='POST' && closingRoute[2]){
      const body=await readJsonBody(request),fresh=authenticatedSession(request);if(!fresh){sendJson(response,401,{error:'La sesión terminó.'});return;}
      sendJson(response,200,monthEnd.review(fresh.user,closingRoute[1],body));return;
    }
    if (url.pathname === '/api/reports/monthly-changes' && request.method === 'GET') {
      sendJson(response,200,audit.monthly(auth.user,url.searchParams.get('month')));return;
    }
    if(url.pathname==='/api/preferences' && request.method==='GET'){
      sendJson(response,200,viewPreferences.get(auth.user));return;
    }
    if(url.pathname==='/api/preferences' && request.method==='PUT'){
      const body=await readJsonBody(request),fresh=authenticatedSession(request);
      if(!fresh){sendJson(response,401,{error:'La sesión terminó.'});return;}
      sendJson(response,200,viewPreferences.update(fresh.user,body));return;
    }
    if (url.pathname === '/api/state' && request.method === 'GET') {
      sendJson(response, 200, scopeState(readState(auth.user.id),auth.user));
      return;
    }

    if (url.pathname === '/api/state' && request.method === 'PUT') {
      const state = await readJsonBody(request);
      const acting=authenticatedSession(request);
      if (!acting) {sendJson(response,401,{error:'La sesión terminó.'});return;}
      const currentState = readState(acting.user.id);
      if (state.revision !== currentState.revision) throw Error('Los datos cambiaron. Actualiza la página antes de guardar para no sobrescribir otra operación.');
      mergeScopedState(currentState,state,acting.user);
      assertRoleStateChange(currentState, state, acting.user);
      assertApprovedQuotationRules(currentState, state, acting.user);
      assertPaymentChanges(currentState, state, acting.user);
      if (acting.user.role !== 'Administrador') {
        state.users = currentState.users;
        const costSettings = hasPermission(currentState.rolePermissions,acting.user.role,'costs')
          ? {standardDailyProduction:state.company.standardDailyProduction,bonusPerExtraBlock:state.company.bonusPerExtraBlock} : {};
        state.company = {...currentState.company,...costSettings};
      }
      sendJson(response, 200, scopeState(writeState(state, acting.user.id),acting.user));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Ruta de API no encontrada.' });
      return;
    }

    const filePath = publicFile(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Archivo no encontrado.');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    console.error(error);
    sendJson(response, 400, { error: error.message || 'No se pudo completar la operación.' });
  }
});

server.listen(PORT, () => {
  console.log(`CC GROMEX disponible en http://localhost:${PORT}`);
  console.log(`Base de datos: ${databasePath}`);
});

const close = () => server.close(() => process.exit(0));
process.on('SIGINT', close);
process.on('SIGTERM', close);
