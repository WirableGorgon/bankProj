export async function login(login, password) {
  return await fetch('http://localhost:3000/login', {
    method: 'POST',
    body: JSON.stringify({
      login,
      password,
    }),
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => res.json());
}

export async function getAccounts(token) {
  return await fetch('http://localhost:3000/accounts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((res) => res.json());
}

export async function createAccount(token) {
  return await fetch('http://localhost:3000/create-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((res) => res.json());
}

export async function getAccount(id, token) {
  return await fetch(`http://localhost:3000/account/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((res) => res.json());
}

export async function transferFunds(from, to, amount, token) {
  return await fetch('http://localhost:3000/transfer-funds', {
    method: 'POST',
    body: JSON.stringify({
      from,
      to,
      amount,
    }),
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((res) => res.json());
}

export async function getCurrencyAccounts(token) {
  return await fetch('http://localhost:3000/currencies', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((data) => data.json());
}

export async function getKnownCurrencies() {
  return await fetch('http://localhost:3000/all-currencies').then((data) =>
    data.json()
  );
}

export async function getBanks() {
  return await fetch('http://localhost:3000/banks').then((data) =>
    data.json()
  );
}

export async function exchangeCurrency(from, to, amount, token) {
  return await fetch('http://localhost:3000/currency-buy', {
    method: 'POST',
    body: JSON.stringify({
      from,
      to,
      amount,
    }),
    headers: {
      'Content-Type': 'application/json',
      authorization: `Basic ${token}`,
    },
  }).then((res) => res.json());
}
