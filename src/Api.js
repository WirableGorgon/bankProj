const API_URL = 'http://localhost:3000';

const SERVER_ERROR_MAP = {
  Unauthorized: {
    message: 'Сессия истекла. Войдите снова.',
    code: 'UNAUTHORIZED',
    isUnauthorized: true,
  },
  'Invalid password': {
    message: 'Неверный логин или пароль.',
    code: 'INVALID_CREDENTIALS',
  },
  'No such user': {
    message: 'Неверный логин или пароль.',
    code: 'INVALID_CREDENTIALS',
  },
  'No such account': {
    message: 'Счет не найден.',
    code: 'ACCOUNT_NOT_FOUND',
  },
  'Invalid account from': {
    message: 'Не удалось определить счет списания.',
    code: 'INVALID_SOURCE_ACCOUNT',
  },
  'Invalid account to': {
    message: 'Счет получателя не найден.',
    code: 'INVALID_TARGET_ACCOUNT',
  },
  'Invalid amount': {
    message: 'Укажите корректную сумму.',
    code: 'INVALID_AMOUNT',
  },
  'Overdraft prevented': {
    message: 'Недостаточно средств.',
    code: 'INSUFFICIENT_FUNDS',
  },
  'Not enough currency': {
    message: 'Недостаточно средств для обмена.',
    code: 'INSUFFICIENT_CURRENCY',
  },
  'Unknown currency code': {
    message: 'Выбрана неподдерживаемая валюта.',
    code: 'UNKNOWN_CURRENCY',
  },
  'Invalid route': {
    message: 'Запрошенный маршрут недоступен.',
    code: 'INVALID_ROUTE',
  },
};

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = 'API_ERROR', serverError = '', isUnauthorized = false } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverError = serverError;
    this.isUnauthorized = isUnauthorized;
  }
}

function buildHeaders(token, headers = {}) {
  const result = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    result.authorization = `Basic ${token}`;
  }

  return result;
}

async function parseResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new ApiError('Сервер вернул некорректный ответ.', {
      status: response.status,
      code: 'INVALID_JSON',
    });
  }
}

function createHttpError(response, data) {
  const serverError = data?.error || '';
  const mappedError = SERVER_ERROR_MAP[serverError];

  if (mappedError) {
    return new ApiError(mappedError.message, {
      status: response.status,
      code: mappedError.code,
      serverError,
      isUnauthorized: Boolean(mappedError.isUnauthorized),
    });
  }

  if (response.status >= 500) {
    return new ApiError('Сервис временно недоступен. Попробуйте позже.', {
      status: response.status,
      code: 'SERVER_ERROR',
      serverError,
    });
  }

  if (response.status >= 400) {
    return new ApiError('Не удалось выполнить запрос. Попробуйте еще раз.', {
      status: response.status,
      code: 'HTTP_ERROR',
      serverError,
    });
  }

  return new ApiError(
    serverError || 'Не удалось обработать ответ сервера. Попробуйте еще раз.',
    {
      status: response.status,
      code: 'API_ERROR',
      serverError,
    }
  );
}

export async function request(path, { method = 'GET', token = '', body, headers } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: buildHeaders(token, headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError('Не удалось подключиться к серверу. Проверьте, что API запущен.', {
      code: 'NETWORK_ERROR',
    });
  }

  const data = await parseResponse(response);

  if (!response.ok || data?.error) {
    throw createHttpError(response, data);
  }

  return data;
}

export function login(userLogin, password) {
  return request('/login', {
    method: 'POST',
    body: {
      login: userLogin,
      password,
    },
  });
}

export function getAccounts(token) {
  return request('/accounts', { token });
}

export function createAccount(token) {
  return request('/create-account', {
    method: 'POST',
    token,
  });
}

export function getAccount(id, token) {
  return request(`/account/${id}`, { token });
}

export function transferFunds(from, to, amount, token) {
  return request('/transfer-funds', {
    method: 'POST',
    token,
    body: {
      from,
      to,
      amount,
    },
  });
}

export function getCurrencyAccounts(token) {
  return request('/currencies', { token });
}

export function getKnownCurrencies() {
  return request('/all-currencies');
}

export function getBanks() {
  return request('/banks');
}

export function exchangeCurrency(from, to, amount, token) {
  return request('/currency-buy', {
    method: 'POST',
    token,
    body: {
      from,
      to,
      amount,
    },
  });
}
