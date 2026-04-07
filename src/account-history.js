import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { Chart } from 'chart.js/auto';
import { getAccount } from './Api';
import { getToken, handleAuthError } from './auth';
import {
  createLoader,
  createPageHeader,
  createSectionCard,
  createStatus,
  formatMoney,
  formatShortDate,
  getLatestTransaction,
  setLoading,
  showStatus,
} from './ui';

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const PAGE_SIZE = 25;
const CHART_MONTHS = 12;

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function buildMonthBuckets(anchorDate, length) {
  const buckets = [];

  for (let index = length - 1; index >= 0; index--) {
    const currentDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - index, 1);
    buckets.push({
      key: `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
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

function buildHistoryStats(account) {
  const anchorTransaction = account.transactions[account.transactions.length - 1];
  const anchorDate = anchorTransaction ? new Date(anchorTransaction.date) : new Date();
  const buckets = buildMonthBuckets(anchorDate, CHART_MONTHS);
  const bucketMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { incoming: 0, outgoing: 0, end: bucket.end },
    ])
  );

  account.transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);
    const key = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
    const bucket = bucketMap.get(key);

    if (!bucket) {
      return;
    }

    if (transaction.to === account.account) {
      bucket.incoming += Number(transaction.amount);
    } else {
      bucket.outgoing += Number(transaction.amount);
    }
  });

  return {
    labels: buckets.map((bucket) => bucket.label),
    balances: buckets.map((bucket) => calculateBalanceAtDate(account, bucket.end)),
    incoming: buckets.map((bucket) => Number(bucketMap.get(bucket.key).incoming.toFixed(2))),
    outgoing: buckets.map((bucket) => Number(bucketMap.get(bucket.key).outgoing.toFixed(2))),
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

function createChart(canvas, datasets, stacked = false) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          bounds: 'data',
          position: 'right',
          stacked,
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
          stacked,
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
          display: stacked,
          labels: {
            color: '#9fb0c9',
            boxWidth: 10,
          },
        },
      },
    },
  });
}

function buildTransactionsTable(table, account, visibleCount) {
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

  const transactions = [...account.transactions].slice(-visibleCount).reverse();

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

export default async function accountHistory(accountNumber, router) {
  const token = getToken();
  let account = null;
  let visibleTransactions = PAGE_SIZE;

  const spin = createLoader('account-history-loader');
  const pageStatus = createStatus({ className: 'page-status' });
  const titleNode = el('span', 'История счета');
  const descriptionNode = el('span', 'Загружаем годовую динамику баланса и историю операций.');
  const balanceMetric = createHeroMetric('Balance now');
  const activityMetric = createHeroMetric('Latest transaction');
  const flowMetric = createHeroMetric('Net flow');
  const historyTable = el('table.data-table');
  const moreButton = el('button.btn.btn-secondary', {
    type: 'button',
    onclick() {
      visibleTransactions += PAGE_SIZE;
      renderTransactions();
    },
  }, 'Больше операций');
  const balanceCanvas = el('canvas');
  const transCanvas = el('canvas');
  const balanceChart = createChart(
    balanceCanvas,
    [{ data: [], backgroundColor: '#5fa8ff', borderRadius: 10, maxBarThickness: 32 }],
    false
  );
  const transactionChart = createChart(
    transCanvas,
    [
      {
        label: 'Исходящие',
        data: [],
        backgroundColor: '#ff6f7f',
        borderRadius: 10,
        maxBarThickness: 32,
      },
      {
        label: 'Входящие',
        data: [],
        backgroundColor: '#46d39a',
        borderRadius: 10,
        maxBarThickness: 32,
      },
    ],
    true
  );

  const pageHeader = createPageHeader({
    eyebrow: 'Account analytics',
    title: titleNode,
    description: descriptionNode,
    breadcrumbs: ['Accounts', 'History'],
    actions: [
      el('button.btn.btn-ghost', {
        type: 'button',
        onclick() {
          router.navigate(`/accounts-list/${accountNumber}`);
        },
      }, 'К деталям счета'),
      el('button.btn.btn-secondary', {
        type: 'button',
        onclick() {
          router.navigate('/accounts-list/');
        },
      }, 'Все счета'),
    ],
    meta: [balanceMetric.node, activityMetric.node, flowMetric.node],
  });

  function renderTransactions() {
    if (!account) {
      return;
    }

    buildTransactionsTable(historyTable, account, visibleTransactions);

    if (account.transactions.length > visibleTransactions) {
      moreButton.hidden = false;
      return;
    }

    moreButton.hidden = true;
  }

  function renderHistory() {
    if (!account) {
      return;
    }

    const latestTransaction = getLatestTransaction(account);
    const incoming = (account.transactions || [])
      .filter((transaction) => transaction.to === account.account)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const outgoing = (account.transactions || [])
      .filter((transaction) => transaction.from === account.account)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    titleNode.textContent = `История счета ${account.account}`;
    descriptionNode.textContent = 'Годовая аналитика по балансу и потокам средств с расширяемой таблицей операций.';
    balanceMetric.set(formatMoney(account.balance), 'Текущий остаток счета');
    activityMetric.set(
      latestTransaction?.date ? formatShortDate(latestTransaction.date) : 'Нет данных',
      latestTransaction?.date ? 'Дата последней операции' : 'Счет пока без истории'
    );
    flowMetric.set(formatMoney(incoming - outgoing), 'Чистый денежный поток за весь период');

    const historyStats = buildHistoryStats(account);

    balanceChart.data.labels = historyStats.labels;
    balanceChart.data.datasets[0].data = historyStats.balances;
    balanceChart.update();

    transactionChart.data.labels = historyStats.labels;
    transactionChart.data.datasets[0].data = historyStats.outgoing;
    transactionChart.data.datasets[1].data = historyStats.incoming;
    transactionChart.update();

    renderTransactions();
  }

  async function loadHistory({ showLoader = true } = {}) {
    if (showLoader) {
      setLoading(spin, true);
    }

    try {
      const response = await getAccount(accountNumber, token);
      account = response.payload;
      renderHistory();
    } catch (error) {
      if (handleAuthError(router, error)) {
        return;
      }

      showStatus(pageStatus, error.message || 'Не удалось загрузить историю счета.', 'error');
    } finally {
      setLoading(spin, false);
    }
  }

  const balanceCard = createSectionCard({
    eyebrow: 'Balance chart',
    title: 'Динамика баланса',
    description: 'Каждый столбец отражает состояние счета на конец месяца.',
    className: 'span-6',
    content: el('div.chart-shell', [balanceCanvas]),
  });

  const flowCard = createSectionCard({
    eyebrow: 'Cashflow',
    title: 'Входящий и исходящий поток',
    description: 'Сравнение поступлений и списаний по месяцам за последний год.',
    className: 'span-6',
    content: el('div.chart-shell', [transCanvas]),
  });

  const tableCard = createSectionCard({
    eyebrow: 'Ledger',
    title: 'История переводов',
    description: 'Таблица поддерживает поэтапную подгрузку, чтобы не перегружать экран длинной историей.',
    className: 'span-12',
    actions: [moreButton],
    content: el('div.data-table-wrap', [historyTable]),
  });

  const screen = el('div.history-grid', [
    el('div.span-12', pageHeader),
    el('div.span-12', pageStatus),
    el('div.span-12', spin),
    balanceCard,
    flowCard,
    tableCard,
  ]);

  await loadHistory();

  return {
    content: [screen],
    cleanup() {
      balanceChart.destroy();
      transactionChart.destroy();
    },
  };
}
