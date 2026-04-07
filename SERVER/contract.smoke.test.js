const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const port = 3101;
const baseUrl = `http://localhost:${port}`;

let serverProcess;

function waitForServer(process) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server start timed out'));
    }, 10000);

    const handleChunk = (chunk) => {
      const text = chunk.toString();

      if (text.includes(`http://localhost:${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    process.stdout.on('data', handleChunk);
    process.stderr.on('data', (chunk) => {
      const text = chunk.toString();

      if (text.includes('EADDRINUSE')) {
        clearTimeout(timeout);
        reject(new Error(`Port ${port} is already in use`));
      }
    });

    process.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test.before(async () => {
  serverProcess = spawn('npm', ['start'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServer(serverProcess);
});

test.after(() => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

test('auth flow returns token and rejects missing auth', async () => {
  const loginResponse = await request('/login', {
    method: 'POST',
    body: JSON.stringify({
      login: 'developer',
      password: 'skillbox',
    }),
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.error, '');
  assert.ok(loginResponse.body.payload.token);

  const unauthorizedResponse = await request('/accounts');

  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(unauthorizedResponse.body.error, 'Unauthorized');
});

test('accounts and account details are available with auth', async () => {
  const loginResponse = await request('/login', {
    method: 'POST',
    body: JSON.stringify({
      login: 'developer',
      password: 'skillbox',
    }),
  });

  const token = loginResponse.body.payload.token;
  const headers = { authorization: `Basic ${token}` };

  const accountsResponse = await request('/accounts', { headers });
  assert.equal(accountsResponse.status, 200);
  assert.ok(accountsResponse.body.payload.length > 0);

  const accountId = accountsResponse.body.payload[0].account;
  const detailsResponse = await request(`/account/${accountId}`, { headers });

  assert.equal(detailsResponse.status, 200);
  assert.equal(detailsResponse.body.payload.account, accountId);
  assert.ok(Array.isArray(detailsResponse.body.payload.transactions));
});

test('transfer validation and currency exchange contract stay stable', async () => {
  const loginResponse = await request('/login', {
    method: 'POST',
    body: JSON.stringify({
      login: 'developer',
      password: 'skillbox',
    }),
  });

  const token = loginResponse.body.payload.token;
  const headers = { authorization: `Basic ${token}` };
  const accountsResponse = await request('/accounts', { headers });
  const accountId = accountsResponse.body.payload[0].account;

  const invalidTransferResponse = await request('/transfer-funds', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: accountId,
      to: '',
      amount: 10,
    }),
  });

  assert.equal(invalidTransferResponse.status, 404);
  assert.equal(invalidTransferResponse.body.error, 'Invalid account to');

  const exchangeResponse = await request('/currency-buy', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: 'USD',
      to: 'EUR',
      amount: 1,
    }),
  });

  assert.equal(exchangeResponse.status, 200);
  assert.equal(exchangeResponse.body.error, '');
  assert.ok(exchangeResponse.body.payload.EUR);
});

test('public banks endpoint stays available', async () => {
  const banksResponse = await request('/banks');

  assert.equal(banksResponse.status, 200);
  assert.ok(Array.isArray(banksResponse.body.payload));
  assert.ok(banksResponse.body.payload.length > 0);
});
