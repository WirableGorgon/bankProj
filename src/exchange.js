import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { exchangeCurrency, getCurrencyAccounts, getKnownCurrencies } from './Api';
import { getToken, handleAuthError } from './auth';
import {
  createBadge,
  createField,
  createLoader,
  createPageHeader,
  createSectionCard,
  createStatus,
  formatMoney,
  hideStatus,
  setLoading,
  showStatus,
} from './ui';

const MAX_RATES = 20;

function createHeroMetric(label) {
  const valueNode = el('div.hero-stat__value', '...');
  const metaNode = el('div.hero-stat__meta', '');

  return {
    node: el('div.hero-stat', [
      el('div.hero-stat__label', label),
      valueNode,
      metaNode,
    ]),
    set(value, meta = '') {
      valueNode.textContent = value;
      metaNode.textContent = meta;
    },
  };
}

function renderCurrencyOptions(select, currencies) {
  select.innerHTML = '';
  currencies.forEach((currency) => {
    select.append(el('option', { value: currency }, currency));
  });
}

function renderBalanceList(container, statusNode, accounts, currencies) {
  container.innerHTML = '';

  const visibleAccounts = currencies
    .map((currency) => accounts[currency])
    .filter((currencyAccount) => currencyAccount && Number(currencyAccount.amount) > 0);

  if (!visibleAccounts.length) {
    showStatus(statusNode, 'На валютных счетах пока нет средств.', 'empty');
    return;
  }

  hideStatus(statusNode);

  visibleAccounts.forEach((currencyAccount) => {
    container.append(
      el('div.currency-balance-row', [
        el('span.currency-balance-row__code', currencyAccount.code),
        el('span.currency-balance-row__amount', formatMoney(currencyAccount.amount, '')),
      ])
    );
  });
}

function renderRateList(container, rates) {
  container.innerHTML = '';

  rates.forEach((item) => {
    container.append(
      el(
        `div.rate-stream__item.${item.change >= 0 ? 'rate-stream__item--up' : 'rate-stream__item--down'}`,
        [
          el('div.stack', [
            el('span.rate-stream__pair', `${item.from}/${item.to}`),
            el(
              'span.rate-stream__direction',
              item.change >= 0 ? 'рост котировки' : 'снижение котировки'
            ),
          ]),
          el('span.rate-stream__value', String(item.rate).replace('.', ',')),
        ]
      )
    );
  });
}

export default async function exchange(router) {
  const token = getToken();
  let socket = null;
  let isCleaningUp = false;
  const rates = [];
  const state = {
    currencies: [],
    accounts: {},
  };

  const pageStatus = createStatus({ className: 'page-status' });
  const spin = createLoader('exchange-loader');
  const balancesStatus = createStatus({ className: 'inline-status' });
  const formStatus = createStatus({ className: 'inline-status' });
  const ratesStatus = createStatus({ className: 'inline-status' });
  const totalCurrenciesMetric = createHeroMetric('Currencies');
  const balancesMetric = createHeroMetric('Available balances');
  const streamMetric = createHeroMetric('Rates stream');
  const curFrom = el('select.select-control', { id: 'cur-from' });
  const curTo = el('select.select-control', { id: 'cur-to' });
  const amountInput = el('input.input-control', {
    id: 'sum-to-change',
    type: 'number',
    min: '0',
    step: '0.01',
    placeholder: '0',
  });
  const curList = el('div.currency-balance-list', { id: 'curList' });
  const rateList = el('div.rate-stream');

  const pageHeader = createPageHeader({
    eyebrow: 'FX workspace',
    title: 'Валютный обмен',
    description: 'Слева доступны ваши валютные балансы, по центру форма конвертации, справа поток рыночных котировок в реальном времени.',
    meta: [totalCurrenciesMetric.node, balancesMetric.node, streamMetric.node],
  });

  async function loadCurrencies() {
    setLoading(spin, true);

    try {
      const [knownCurrenciesResponse, accountsResponse] = await Promise.all([
        getKnownCurrencies(),
        getCurrencyAccounts(token),
      ]);

      state.currencies = knownCurrenciesResponse.payload;
      state.accounts = accountsResponse.payload;

      renderCurrencyOptions(curFrom, state.currencies);
      renderCurrencyOptions(curTo, state.currencies);
      renderBalanceList(curList, balancesStatus, state.accounts, state.currencies);
      totalCurrenciesMetric.set(String(state.currencies.length), 'Валюты, доступные для обмена');
      balancesMetric.set(
        String(
          Object.values(state.accounts).filter((account) => Number(account.amount) > 0).length
        ),
        'Валютные позиции с ненулевым остатком'
      );
      hideStatus(pageStatus);
    } catch (error) {
      if (handleAuthError(router, error)) {
        return;
      }

      showStatus(pageStatus, error.message || 'Не удалось загрузить валютные счета.', 'error');
    } finally {
      setLoading(spin, false);
    }
  }

  function initRatesStream() {
    showStatus(ratesStatus, 'Подключаем поток курсов...', 'info');
    streamMetric.set('Connecting', 'Соединение с market feed');

    socket = new WebSocket('ws://localhost:3000/currency-feed');

    socket.onopen = () => {
      showStatus(ratesStatus, 'Поток курсов подключен.', 'success');
      streamMetric.set('Online', 'Котировки поступают в реальном времени');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type !== 'EXCHANGE_RATE_CHANGE') {
          return;
        }

        rates.unshift(payload);
        if (rates.length > MAX_RATES) {
          rates.pop();
        }

        renderRateList(rateList, rates);
      } catch (error) {
        showStatus(ratesStatus, 'Не удалось обработать обновление курса.', 'error');
        streamMetric.set('Warning', 'Получено поврежденное сообщение');
      }
    };

    socket.onerror = () => {
      showStatus(ratesStatus, 'Поток курсов сейчас недоступен.', 'error');
      streamMetric.set('Offline', 'Realtime feed временно недоступен');
    };

    socket.onclose = () => {
      if (!isCleaningUp) {
        showStatus(ratesStatus, 'Соединение с потоком курсов прервалось.', 'error');
        streamMetric.set('Closed', 'Соединение прервано');
      }
    };
  }

  const exchangeButton = el('button.btn.btn-primary', {
    type: 'button',
    async onclick(event) {
      event.preventDefault();
      amountInput.classList.remove('error-input');
      curFrom.classList.remove('error-input');
      curTo.classList.remove('error-input');
      hideStatus(formStatus);

      const fromCurrency = curFrom.value;
      const toCurrency = curTo.value;
      const amount = Number(amountInput.value);

      if (!fromCurrency || !toCurrency) {
        showStatus(formStatus, 'Сначала дождитесь загрузки валют.', 'error');
        return;
      }

      if (fromCurrency === toCurrency) {
        curFrom.classList.add('error-input');
        curTo.classList.add('error-input');
        showStatus(formStatus, 'Выберите разные валюты для обмена.', 'error');
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.classList.add('error-input');
        showStatus(formStatus, 'Укажите корректную сумму обмена.', 'error');
        return;
      }

      exchangeButton.disabled = true;

      try {
        const response = await exchangeCurrency(fromCurrency, toCurrency, amount, token);
        state.accounts = response.payload;
        renderBalanceList(curList, balancesStatus, state.accounts, state.currencies);
        amountInput.value = '';
        showStatus(formStatus, 'Обмен успешно выполнен.', 'success');
        balancesMetric.set(
          String(
            Object.values(state.accounts).filter((account) => Number(account.amount) > 0).length
          ),
          'Валютные позиции с ненулевым остатком'
        );
      } catch (error) {
        if (handleAuthError(router, error)) {
          return;
        }

        showStatus(formStatus, error.message || 'Не удалось выполнить обмен.', 'error');
      } finally {
        exchangeButton.disabled = false;
      }
    },
  }, 'Обменять');

  const balancesCard = createSectionCard({
    eyebrow: 'Wallet balances',
    title: 'Ваши валюты',
    description: 'Отображаются только валютные позиции с положительным остатком.',
    className: 'span-5',
    content: [
      el('div.button-row', [createBadge('live balances', 'info')]),
      balancesStatus,
      curList,
    ],
  });

  const exchangeCard = createSectionCard({
    eyebrow: 'Trade ticket',
    title: 'Обмен валюты',
    description: 'Выберите направление обмена и сумму. После успешной конвертации баланс обновится без перезагрузки экрана.',
    className: 'span-7 exchange-ticket-card',
    tone: 'accent',
    content: [
      el('form.exchange-form', [
        el('div.split-fields', [
          createField({
            label: 'Из валюты',
            control: curFrom,
            hint: 'Источник списания',
          }),
          createField({
            label: 'В валюту',
            control: curTo,
            hint: 'Целевая валюта',
          }),
        ]),
        createField({
          label: 'Сумма обмена',
          control: amountInput,
          hint: 'Поддерживаются дробные значения.',
        }),
        el('div.exchange-form__actions', [exchangeButton]),
      ]),
      formStatus,
    ],
  });

  const ratesCard = createSectionCard({
    eyebrow: 'Realtime market',
    title: 'Изменение курсов',
    description: 'Лента показывает последние изменения рыночных котировок в порядке поступления.',
    className: 'span-12',
    content: [ratesStatus, rateList],
  });

  const screen = el('div.exchange-grid', [
    el('div.span-12', pageHeader),
    el('div.span-12', pageStatus),
    el('div.span-12', spin),
    balancesCard,
    exchangeCard,
    ratesCard,
  ]);

  await loadCurrencies();
  initRatesStream();

  return {
    content: [screen],
    cleanup() {
      isCleaningUp = true;
      if (socket) {
        socket.close();
      }
    },
  };
}
