import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { Chart } from 'chart.js/auto';
import { getAccount, transferFunds } from './Api';
import { getToken, handleAuthError } from './auth';
import {
  createBadge,
  createField,
  createLoader,
  createMetricRow,
  createPageHeader,
  createSectionCard,
  createStatus,
  formatMoney,
  formatShortDate,
  getLatestTransaction,
  hideStatus,
  setLoading,
  showStatus,
} from './ui';

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const SAVED_RECIPIENTS_KEY = 'inputNums';
const CHART_MONTHS = 6;

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function buildMonthBuckets(anchorDate, length) {
  const buckets = [];

  for (let index = length - 1; index >= 0; index--) {
    const currentDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - index, 1);
    buckets.push({
      label: MONTH_NAMES[currentDate.getMonth()],
      end: endOfMonth(currentDate),
    });
  }

  return buckets;
}

function calculateBalanceAtDate(account, targetDate) {
  let balance = Number(account.balance) || 0;

  account.transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);

    if (transactionDate > targetDate) {
      if (transaction.to === account.account) {
        balance -= Number(transaction.amount);
      } else {
        balance += Number(transaction.amount);
      }
    }
  });

  return Number(balance.toFixed(2));
}

function buildBalanceChartData(account) {
  const anchorTransaction = account.transactions[account.transactions.length - 1];
  const anchorDate = anchorTransaction ? new Date(anchorTransaction.date) : new Date();
  const buckets = buildMonthBuckets(startOfMonth(anchorDate), CHART_MONTHS);

  return {
    labels: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => calculateBalanceAtDate(account, bucket.end)),
  };
}

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

function readSavedRecipients() {
  const rawValue = localStorage.getItem(SAVED_RECIPIENTS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    const nextValue = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
    return nextValue.filter(Boolean);
  } catch (error) {
    localStorage.removeItem(SAVED_RECIPIENTS_KEY);
    return [];
  }
}

function saveRecipient(accountNumber) {
  const nextAccount = accountNumber.trim();

  if (!nextAccount) {
    return;
  }

  const nextRecipients = [...new Set([...readSavedRecipients(), nextAccount])].slice(-10);
  localStorage.setItem(SAVED_RECIPIENTS_KEY, JSON.stringify(nextRecipients));
}

function buildTransactionsTable(table, account) {
  table.innerHTML = '';
  const head = el('thead', [
    el('tr', [
      el('th', 'Счет отправителя'),
      el('th', 'Счет получателя'),
      el('th', 'Сумма'),
      el('th', 'Дата'),
    ]),
  ]);
  const body = el('tbody');

  const transactions = [...account.transactions].slice(-10).reverse();

  if (!transactions.length) {
    body.append(
      el('tr', [
        el('td', { colspan: 4 }, 'По счету пока нет операций.'),
      ])
    );
    table.append(head, body);
    return;
  }

  transactions.forEach((transaction) => {
    body.append(
      el('tr', [
        el('td', transaction.from),
        el('td', transaction.to),
        el(
          `td.table-amount.${transaction.to === account.account ? 'table-amount--in' : 'table-amount--out'}`,
          `${transaction.to === account.account ? '+' : '-'}${formatMoney(transaction.amount)}`
        ),
        el('td', formatShortDate(transaction.date)),
      ])
    );
  });

  table.append(head, body);
}

function updateDatalist(datalist) {
  datalist.innerHTML = '';

  readSavedRecipients().forEach((accountNumber) => {
    datalist.append(el('option', { value: accountNumber }, accountNumber));
  });
}

function resetInputState(...inputs) {
  inputs.forEach((input) => input.classList.remove('error-input'));
}

function createChart(canvas) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: '#5fa8ff',
          borderRadius: 10,
          maxBarThickness: 38,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          bounds: 'data',
          position: 'right',
          grid: {
            color: 'rgba(148, 163, 184, 0.12)',
            drawBorder: false,
          },
          ticks: {
            color: '#9fb0c9',
            font: {
              size: 12,
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#9fb0c9',
            font: {
              size: 12,
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

export default async function accountDetails(accountNumber, router) {
  const token = getToken();
  let account = null;

  const spin = createLoader('account-details-loader');
  const pageStatus = createStatus({ className: 'page-status' });
  const formStatus = createStatus({ className: 'inline-status' });
  const titleNode = el('span', 'Счет');
  const descriptionNode = el('span', 'Загружаем состояние счета, переводы и краткую аналитику.');
  const balanceMetric = createHeroMetric('Available balance');
  const activityMetric = createHeroMetric('Last activity');
  const operationsMetric = createHeroMetric('Transactions');
  const recipientDatalist = el('datalist', { id: 'typed-list' });
  const recipientInput = el('input.input-control', {
    list: 'typed-list',
    id: 'num-to-trans',
    placeholder: 'Введите номер счета',
    onfocus() {
      updateDatalist(recipientDatalist);
    },
  });
  const amountInput = el('input.input-control', {
    id: 'sum-to-trans',
    type: 'number',
    min: '0',
    step: '0.01',
    placeholder: '0',
  });
  const historyTable = el('table.data-table');
  const latestBadgeHost = el('div.button-row');
  const quickMetrics = el('div.quick-metrics');
  const chartCanvas = el('canvas');
  const chart = createChart(chartCanvas);

  const pageHeader = createPageHeader({
    eyebrow: 'Account details',
    title: titleNode,
    description: descriptionNode,
    breadcrumbs: ['Accounts', 'Details'],
    actions: [
      el('button.btn.btn-ghost', {
        type: 'button',
        onclick() {
          router.navigate('/accounts-list/');
        },
      }, 'К списку счетов'),
      el('button.btn.btn-secondary', {
        type: 'button',
        onclick() {
          router.navigate(`/accounts-list/${accountNumber}/history`);
        },
      }, 'Полная история'),
    ],
    meta: [balanceMetric.node, activityMetric.node, operationsMetric.node],
  });

  function renderAccountDetails() {
    if (!account) {
      return;
    }

    hideStatus(pageStatus);
    titleNode.textContent = `Счет ${account.account}`;
    descriptionNode.textContent = 'Панель с быстрым переводом, последними операциями и динамикой баланса за последние шесть месяцев.';

    const latestTransaction = getLatestTransaction(account);
    balanceMetric.set(formatMoney(account.balance), 'Доступный остаток по счету');
    activityMetric.set(
      latestTransaction?.date ? formatShortDate(latestTransaction.date) : 'Нет данных',
      latestTransaction?.date ? 'Дата последней зафиксированной операции' : 'История пока не заполнена'
    );
    operationsMetric.set(String(account.transactions?.length || 0), 'Всего операций по счету');

    quickMetrics.replaceChildren(
      createMetricRow({
        label: 'Исходящие',
        value: formatMoney(
          (account.transactions || [])
            .filter((transaction) => transaction.from === account.account)
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
        ),
        meta: 'Сумма списаний по истории',
        tone: 'danger',
      }),
      createMetricRow({
        label: 'Входящие',
        value: formatMoney(
          (account.transactions || [])
            .filter((transaction) => transaction.to === account.account)
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
        ),
        meta: 'Сумма поступлений по истории',
        tone: 'success',
      }),
      createMetricRow({
        label: 'Получатели',
        value: String(readSavedRecipients().length),
        meta: 'Сохраненные счета для автодополнения',
      })
    );

    latestBadgeHost.replaceChildren(
      createBadge(
        latestTransaction?.date ? 'latest activity synced' : 'new account',
        latestTransaction?.date ? 'success' : 'info'
      )
    );

    const chartData = buildBalanceChartData(account);
    chart.data.labels = chartData.labels;
    chart.data.datasets[0].data = chartData.values;
    chart.update();

    buildTransactionsTable(historyTable, account);
  }

  async function loadAccountDetails({ showLoader = true } = {}) {
    if (showLoader) {
      setLoading(spin, true);
    }

    try {
      const response = await getAccount(accountNumber, token);
      account = response.payload;
      renderAccountDetails();
    } catch (error) {
      if (handleAuthError(router, error)) {
        return;
      }

      showStatus(pageStatus, error.message || 'Не удалось загрузить счет.', 'error');
    } finally {
      setLoading(spin, false);
    }
  }

  const sendButton = el('button.btn.btn-primary', {
    async onclick(event) {
      event.preventDefault();
      resetInputState(recipientInput, amountInput);
      hideStatus(formStatus);

      if (!account) {
        showStatus(formStatus, 'Сначала дождитесь загрузки счета.', 'error');
        return;
      }

      const recipient = recipientInput.value.trim();
      const amount = Number(amountInput.value);

      if (!recipient) {
        recipientInput.classList.add('error-input');
        showStatus(formStatus, 'Укажите счет получателя.', 'error');
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.classList.add('error-input');
        showStatus(formStatus, 'Укажите корректную сумму перевода.', 'error');
        return;
      }

      if (amount > Number(account.balance)) {
        amountInput.classList.add('error-input');
        showStatus(formStatus, 'Недостаточно средств.', 'error');
        return;
      }

      sendButton.disabled = true;
      setLoading(spin, true);

      try {
        await transferFunds(account.account, recipient, amount, token);
        saveRecipient(recipient);
        recipientInput.value = '';
        amountInput.value = '';
        showStatus(formStatus, 'Перевод успешно выполнен.', 'success');
        await loadAccountDetails({ showLoader: false });
      } catch (error) {
        if (handleAuthError(router, error)) {
          return;
        }

        showStatus(formStatus, error.message || 'Не удалось выполнить перевод.', 'error');
      } finally {
        sendButton.disabled = false;
        setLoading(spin, false);
      }
    },
  }, 'Отправить');
  const transferCard = createSectionCard({
    eyebrow: 'Transfers',
    title: 'Новый перевод',
    description: 'Отправьте средства на другой счет. История получателей подставляется автоматически из последних успешных операций.',
    className: 'span-5',
    content: [
      latestBadgeHost,
      quickMetrics,
      el('form.transfer-form', [
        createField({
          label: 'Счет получателя',
          control: recipientInput,
          hint: 'Введите номер счета или выберите сохраненный вариант.',
        }),
        recipientDatalist,
        createField({
          label: 'Сумма перевода',
          control: amountInput,
          hint: 'Поддерживаются значения с копейками.',
        }),
        el('div.transfer-form__actions', [sendButton]),
      ]),
      formStatus,
    ],
  });

  const chartCard = createSectionCard({
    eyebrow: 'Balance analytics',
    title: 'Динамика баланса',
    description: 'График показывает изменение баланса за последние шесть месяцев, чтобы быстро оценить тенденцию счета.',
    className: 'span-7',
    content: el('div.chart-shell.chart-shell--short', [chartCanvas]),
  });

  const historyCard = createSectionCard({
    eyebrow: 'Recent activity',
    title: 'Последние операции',
    description: 'Компактная таблица для быстрого обзора последних десяти движений по счету.',
    className: 'span-12',
    actions: [
      el('button.btn.btn-secondary', {
        type: 'button',
        onclick() {
          router.navigate(`/accounts-list/${accountNumber}/history`);
        },
      }, 'Открыть аналитический экран'),
    ],
    content: el('div.data-table-wrap', [historyTable]),
  });

  const screen = el('div.details-grid', [
    el('div.span-12', pageHeader),
    el('div.span-12', pageStatus),
    el('div.span-12', spin),
    transferCard,
    chartCard,
    historyCard,
  ]);

  await loadAccountDetails();

  return {
    content: [screen],
    cleanup() {
      chart.destroy();
    },
  };
}
