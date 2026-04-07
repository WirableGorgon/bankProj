import 'babel-polyfill';
import './style.scss';
import { el, setChildren } from 'redom';
import Navigo from 'navigo';
import header from './header';
import accountsList from './accounts-list';
import accountDetails from './account-details';
import accountHistory from './account-history';
import exchange from './exchange';
import mapp from './map';
import { login } from './Api';
import { clearToken, hasToken, requireAuth, setToken } from './auth';
import {
  createField,
  createMetricRow,
  createStatus,
  hideStatus,
  showStatus,
} from './ui';

const router = new Navigo('/');
let currentCleanup = null;

function normalizeScreen(screen) {
  if (screen && !Array.isArray(screen) && screen.content) {
    return screen;
  }

  return {
    content: Array.isArray(screen) ? screen : [screen],
    cleanup: null,
  };
}

function cleanupCurrentScreen() {
  if (typeof currentCleanup === 'function') {
    currentCleanup();
  }

  currentCleanup = null;
}

function renderAppShell(currentRoute, screenContent) {
  const content = Array.isArray(screenContent) ? screenContent : [screenContent];
  const main = el('main.app-main', [
    el('div.app-main__inner.screen-stack', content),
  ]);

  document.body.className = '';
  setChildren(window.document.body, [
    el('div.app-shell', [
      header(router, currentRoute),
      main,
    ]),
  ]);
}

async function renderPrivateRoute(renderScreen, currentRoute) {
  cleanupCurrentScreen();

  if (!requireAuth(router)) {
    return;
  }

  try {
    const screen = normalizeScreen(await renderScreen());
    currentCleanup = screen.cleanup;
    renderAppShell(currentRoute, screen.content);
  } catch (error) {
    if (error?.isUnauthorized) {
      clearToken();
      router.navigate('/');
      return;
    }

    const status = createStatus({
      tone: 'error',
      className: 'page-status',
      hidden: false,
    });
    status.textContent = error?.message || 'Не удалось открыть страницу.';
    renderAppShell(currentRoute, [status]);
  }
}

export function createAuthPage() {
  if (hasToken()) {
    router.navigate('/accounts-list/');
    return [];
  }

  const authStatus = createStatus({ className: 'auth-status' });
  const loginInput = el('input.input-control', {
    placeholder: 'Логин',
    id: 'log',
    autocomplete: 'username',
  });
  const passwordInput = el('input.input-control', {
    placeholder: 'Пароль',
    id: 'pas',
    type: 'password',
    autocomplete: 'current-password',
  });
  const submitButton = el('button.btn.btn-primary', {
    type: 'submit',
    async onclick(event) {
      event.preventDefault();
      hideStatus(authStatus);
      submitButton.disabled = true;

      try {
        const response = await login(loginInput.value, passwordInput.value);
        setToken(response.payload.token);
        router.navigate('/accounts-list/');
      } catch (error) {
        showStatus(
          authStatus,
          error.message || 'Не удалось войти. Попробуйте позже.',
          'error'
        );
      } finally {
        submitButton.disabled = false;
      }
    },
  }, 'Войти');

  const authorizationPage = el('section.auth-shell', [
    el('div.auth-shell__inner', [
      el('div.auth-panel', [
        el('div.auth-panel__brand', [
          el('div.auth-kicker', 'Fintech portfolio experience'),
          el('div.brand', [
            el('div.brand__mark', 'C.'),
            el('div.brand__copy', [
              el('div.brand__title', 'Coin.'),
              el('div.brand__subtitle', 'premium banking'),
            ]),
          ]),
          el('h1.auth-panel__title', 'Управляйте счетами, переводами и валютой в одном dark workspace.'),
          el(
            'p.auth-panel__description',
            'Обновленный интерфейс собирает ключевые сценарии в единый продуктовый shell: balances, transfers, analytics, rates stream и ATM map.'
          ),
        ]),
        el('div.auth-panel__metrics', [
          createMetricRow({
            label: 'Accounts overview',
            value: '24/7',
            meta: 'Единый доступ к счетам и операциям',
            compact: true,
          }),
          createMetricRow({
            label: 'Live market',
            value: 'FX',
            meta: 'Поток валютных курсов в реальном времени',
            compact: true,
          }),
          createMetricRow({
            label: 'ATM network',
            value: 'Map',
            meta: 'Быстрый поиск банкоматов по карте',
            compact: true,
          }),
        ]),
      ]),
      el('div.auth-card', [
        el('div.auth-card__header', [
          el('div.auth-kicker', 'Secure access'),
          el('h2.auth-card__title', 'Вход в рабочее пространство'),
          el(
            'p.auth-card__description',
            'Используйте тестовый аккаунт, чтобы проверить новый premium flow и основные банковские сценарии.'
          ),
        ]),
        el('form.auth-form', [
          createField({
            label: 'Логин',
            control: loginInput,
            hint: 'Демо-пользователь: developer',
          }),
          createField({
            label: 'Пароль',
            control: passwordInput,
            hint: 'Демо-пароль: skillbox',
          }),
          submitButton,
          authStatus,
        ]),
        el('div.auth-card__footer', 'Сессия сохраняется локально и автоматически открывает рабочие экраны после входа.'),
      ]),
    ]),
  ]);

  return [authorizationPage];
}

router.on('/', () => {
  cleanupCurrentScreen();
  document.body.className = '';
  setChildren(window.document.body, createAuthPage());
});

router.on('/map/', () => renderPrivateRoute(() => mapp(router), '/map/'));

router.on('/exchange/', () => renderPrivateRoute(() => exchange(router), '/exchange/'));

router.on('/accounts-list/', () => renderPrivateRoute(() => accountsList(router), '/accounts-list/'));

router.on('/accounts-list/:accountNumber', ({ data: { accountNumber } }) =>
  renderPrivateRoute(() => accountDetails(accountNumber, router), `/accounts-list/${accountNumber}`)
);

router.on('/accounts-list/:accountNumber/history', ({ data: { accountNumber } }) =>
  renderPrivateRoute(() => accountHistory(accountNumber, router), `/accounts-list/${accountNumber}/history`)
);

router.notFound(() => {
  router.navigate(hasToken() ? '/accounts-list/' : '/');
});

router.resolve();
