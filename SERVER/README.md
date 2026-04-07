# Backend for Bank Portfolio

## Запуск

1. Перейдите в директорию `SERVER`
2. Установите зависимости: `npm install`
3. Запустите сервер: `npm start`

API поднимается на `http://localhost:3000`.
Для smoke-проверки контракта можно выполнить `npm test`.

## Демо-доступ

- логин: `developer`
- пароль: `skillbox`
- токен в защищенных запросах: `Authorization: Basic <token>`

## Формат ответа

Каждый HTTP-эндпоинт возвращает JSON следующего вида:

```json
{
  "payload": {},
  "error": ""
}
```

- при успешном запросе `error` пустой
- при ошибке `payload` равен `null`

## Основные эндпоинты

### `POST /login`

Тело запроса:

```json
{
  "login": "developer",
  "password": "skillbox"
}
```

Успех: `200`

```json
{
  "payload": {
    "token": "..."
  },
  "error": ""
}
```

Ошибки:

- `401 Invalid password`

### `GET /accounts`

Возвращает список пользовательских счетов. В каждом счете приходит только последняя транзакция.

Ошибки:

- `401 Unauthorized`

### `GET /account/:id`

Возвращает полную информацию по пользовательскому счету и всю историю транзакций.

Ошибки:

- `401 Unauthorized`
- `404 No such account`

### `POST /create-account`

Создает новый пользовательский счет.

Успех: `201`

Ошибки:

- `401 Unauthorized`

### `POST /transfer-funds`

Тело запроса:

```json
{
  "from": "74213041477477406320783754",
  "to": "61253747452820828268825011",
  "amount": 100
}
```

Ошибки:

- `400 Invalid account from`
- `400 Invalid amount`
- `401 Unauthorized`
- `404 Invalid account to`
- `409 Overdraft prevented`

### `GET /all-currencies`

Возвращает массив поддерживаемых валютных кодов.

### `GET /currencies`

Возвращает объект валютных счетов пользователя.

Ошибки:

- `401 Unauthorized`

### `POST /currency-buy`

Тело запроса:

```json
{
  "from": "USD",
  "to": "EUR",
  "amount": 10
}
```

Ошибки:

- `400 Unknown currency code`
- `400 Invalid amount`
- `401 Unauthorized`
- `409 Not enough currency`
- `409 Overdraft prevented`

### `GET /banks`

Возвращает массив координат банкоматов.

### `WS /currency-feed`

Поток курсов валют в формате:

```json
{
  "type": "EXCHANGE_RATE_CHANGE",
  "from": "USD",
  "to": "EUR",
  "rate": 1.12,
  "change": 1
}
```

## Технические заметки

- Сервер использует фиксированный учебный набор данных из `public/data.json`
- Для несуществующих маршрутов сервер отвечает `404 Invalid route`
- При невалидном JSON в теле запроса сервер отвечает `400 Invalid JSON`
