import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { createAccount, getAccounts } from './Api';
import { getToken, handleAuthError } from './auth';
import {
  createBadge,
  createEmptyState,
  createLoader,
  createMetricRow,
  createPageHeader,
  createSectionCard,
  createStatus,
  formatMoney,
  getLastTransactionLabel,
  getLatestTransaction,
  hideStatus,
  setLoading,
  showStatus,
} from './ui';

export default function accountsList(router) {
  const token = getToken();
  const accounts = [];
  const spin = createLoader('accounts-loader');
  const status = createStatus({ className: 'page-status' });
  const metricsWrap = el('div.accounts-summary');
  const list = el('div.account-cards');
  const sort = el('select.select-control', [
    el('option', { value: 'recent', selected: true }, 'По последней активности'),
    el('option', { value: 'balance' }, 'По балансу'),
    el('option', { value: 'number' }, 'По номеру счета'),
  ]);

  function sortAccounts(list, sortValue) {
    const nextAccounts = [...list];

    if (sortValue === 'number') {
      nextAccounts.sort((a, b) => a.account.localeCompare(b.account));
    } else if (sortValue === 'balance') {
      nextAccounts.sort((a, b) => Number(b.balance) - Number(a.balance));
    } else {
      nextAccounts.sort((a, b) => {
        const firstDate = getLatestTransaction(a)?.date || '';
        const secondDate = getLatestTransaction(b)?.date || '';
        return secondDate.localeCompare(firstDate);
      });
    }

    return nextAccounts;
  }

  function createHeroMetric(label, value, meta) {
    return el('div.hero-stat', [
      el('div.hero-stat__label', label),
      el('div.hero-stat__value', value),
      el('div.hero-stat__meta', meta),
    ]);
  }

  function updateSummary() {
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const activeAccounts = accounts.filter((account) => getLatestTransaction(account)?.date).length;

    metricsWrap.replaceChildren(
      createMetricRow({
        label: 'Всего счетов',
        value: String(accounts.length).padStart(2, '0'),
        meta: 'Полный набор открытых счетов',
      }),
      createMetricRow({
        label: 'Совокупный баланс',
        value: formatMoney(totalBalance),
        meta: 'Общая стоимость всех счетов',
        tone: 'success',
      }),
      createMetricRow({
        label: 'Активные счета',
        value: String(activeAccounts),
        meta: 'Со свежими операциями в истории',
      })
    );
  }

  function createAccountCard(account) {
    return el('article.account-card', [
      el('div.account-card__top', [
        el('div.stack', [
          el('div.account-card__number', account.account),
          el('div.account-card__meta', 'Номер счета и доступный остаток'),
        ]),
        createBadge(
          getLatestTransaction(account)?.date ? 'active' : 'new',
          getLatestTransaction(account)?.date ? 'success' : 'info'
        ),
      ]),
      el('div.stack', [
        el('div.account-card__balance', formatMoney(account.balance)),
        el('div.account-card__caption', `Последняя операция: ${getLastTransactionLabel(account)}`),
      ]),
      el('div.account-card__bottom', [
        el('div.account-card__trend', `Транзакций: ${account.transactions?.length || 0}`),
        el('div.account-card__actions', [
          el('button.btn.btn-secondary', {
            type: 'button',
            onclick() {
              router.navigate(`/accounts-list/${account.account}`);
            },
          }, 'Открыть счет'),
        ]),
      ]),
    ]);
  }

  function renderAccounts() {
    list.innerHTML = '';
    hideStatus(status);
    updateSummary();

    const sortedAccounts = sortAccounts(accounts, sort.value);

    if (!sortedAccounts.length) {
      list.append(
        createEmptyState({
          title: 'Пока нет ни одного счета',
          description: 'Создайте первый счет, чтобы увидеть баланс, историю операций и новые аналитические блоки.',
        })
      );
      return;
    }

    sortedAccounts.forEach((account) => {
      list.append(createAccountCard(account));
    });
  }

  async function loadAccounts({ showLoader = true } = {}) {
    if (showLoader) {
      setLoading(spin, true);
    }

    try {
      const response = await getAccounts(token);
      accounts.splice(0, accounts.length, ...response.payload);
      renderAccounts();
    } catch (error) {
      list.innerHTML = '';

      if (handleAuthError(router, error)) {
        return;
      }

      showStatus(status, error.message || 'Не удалось загрузить список счетов.', 'error');
    } finally {
      setLoading(spin, false);
    }
  }

  sort.addEventListener('change', () => {
    renderAccounts();
  });

  const newAccountButton = el('button.btn.btn-primary', {
    type: 'button',
    async onclick(event) {
      event.preventDefault();
      newAccountButton.disabled = true;
      hideStatus(status);

      try {
        await createAccount(token);
        await loadAccounts();
      } catch (error) {
        if (handleAuthError(router, error)) {
          return;
        }

        showStatus(status, error.message || 'Не удалось создать новый счет.', 'error');
      } finally {
        newAccountButton.disabled = false;
      }
    },
  }, 'Открыть новый счет');

  const pageHeader = createPageHeader({
    eyebrow: 'Accounts overview',
    title: 'Ваши счета',
    description: 'Рабочая зона для управления балансами, открытия новых счетов и быстрого перехода к аналитике по каждой карточке.',
    actions: [newAccountButton],
    meta: [
      createHeroMetric('Portfolio balance', 'Live', 'Баланс и активность обновляются после каждого запроса'),
      createHeroMetric('Routing', 'Fast', 'Переходите к переводам и истории за один клик'),
    ],
  });

  const summaryCard = createSectionCard({
    eyebrow: 'Portfolio health',
    title: 'Ключевые показатели',
    description: 'Снимок текущего состояния счетов и активности.',
    className: 'span-8',
    content: metricsWrap,
  });

  const controlsCard = createSectionCard({
    eyebrow: 'List controls',
    title: 'Сортировка и действия',
    description: 'Меняйте порядок счетов и создавайте новые без перехода на отдельный экран.',
    className: 'span-4',
    content: [
      el('div.stack', [
        el('div.surface-note', 'Сортировка перестраивает сетку без повторного запроса к API.'),
        sort,
      ]),
      status,
    ],
  });

  const accountsCard = createSectionCard({
    eyebrow: 'Account registry',
    title: 'Каталог счетов',
    description: 'Карточки сгруппированы в responsive-сетку с акцентом на баланс и последнюю активность.',
    className: 'span-12',
    content: [spin, list],
  });

  const screen = el('div.accounts-grid', [
    el('div.span-12', pageHeader),
    summaryCard,
    controlsCard,
    accountsCard,
  ]);

  loadAccounts();

  return [screen];
}
