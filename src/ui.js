import { el } from 'redom';
import { format } from 'date-fns';

const LONG_MONTH_NAMES = {
  January: 'января',
  February: 'февраля',
  March: 'марта',
  April: 'апреля',
  May: 'мая',
  June: 'июня',
  July: 'июля',
  August: 'августа',
  September: 'сентября',
  October: 'октября',
  November: 'ноября',
  December: 'декабря',
};

function toChildren(value) {
  if (value === null || value === undefined || value === false) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function createLoader(id = 'spin') {
  return el('div.loader-shell', { id, hidden: true }, [
    el('span.loader-ring'),
    el('span.loader-text', 'Загружаем данные'),
  ]);
}

export function setLoading(loader, isLoading) {
  loader.hidden = !isLoading;
}

export function createStatus({ tone = 'info', className = '', hidden = true } = {}) {
  return el('div', {
    className: ['screen-status', `screen-status--${tone}`, className].filter(Boolean).join(' '),
    'data-extra-class': className,
    hidden,
  });
}

export function showStatus(node, message, tone = 'error') {
  const extraClass = node.getAttribute('data-extra-class');
  node.textContent = message;
  node.className = ['screen-status', `screen-status--${tone}`, extraClass].filter(Boolean).join(' ');
  node.hidden = false;
}

export function hideStatus(node) {
  node.textContent = '';
  node.hidden = true;
}

export function createBadge(label, tone = 'neutral') {
  return el(`span.status-badge.status-badge--${tone}`, label);
}

export function createInlineNotice({
  tone = 'info',
  title = '',
  message = '',
  className = '',
  action = null,
} = {}) {
  return el('div', {
    className: ['inline-notice', `inline-notice--${tone}`, className].filter(Boolean).join(' '),
  }, [
    el('div.inline-notice__body', [
      title ? el('div.inline-notice__title', title) : null,
      message ? el('div.inline-notice__message', message) : null,
    ]),
    ...toChildren(action),
  ]);
}

export function createMetricRow({
  label,
  value,
  meta = '',
  tone = 'neutral',
  compact = false,
} = {}) {
  return el('div', {
    className: [
      'metric-row',
      `metric-row--${tone}`,
      compact ? 'metric-row--compact' : '',
    ].filter(Boolean).join(' '),
  }, [
    el('span.metric-row__label', label),
    el('span.metric-row__value', value),
    meta ? el('span.metric-row__meta', meta) : null,
  ]);
}

export function createField({ label, control, hint = '', className = '' } = {}) {
  return el('label', {
    className: ['form-field', className].filter(Boolean).join(' '),
  }, [
    label ? el('span.form-field__label', label) : null,
    control,
    hint ? el('span.form-field__hint', hint) : null,
  ]);
}

export function createSectionCard({
  eyebrow = '',
  title = '',
  description = '',
  actions = [],
  content = [],
  tone = 'default',
  className = '',
  bodyClassName = '',
} = {}) {
  return el('section', {
    className: [
      'section-card',
      `section-card--${tone}`,
      className,
    ].filter(Boolean).join(' '),
  }, [
    eyebrow || title || description || toChildren(actions).length
      ? el('div.section-card__header', [
        el('div.section-card__heading', [
          eyebrow ? el('div.section-card__eyebrow', eyebrow) : null,
          title ? el('h2.section-card__title', title) : null,
          description ? el('p.section-card__description', description) : null,
        ]),
        ...(
          toChildren(actions).length
            ? [el('div.section-card__actions', toChildren(actions))]
            : []
        ),
      ])
      : null,
    el('div', {
      className: ['section-card__body', bodyClassName].filter(Boolean).join(' '),
    }, toChildren(content)),
  ]);
}

export function createPageHeader({
  eyebrow = '',
  title = '',
  description = '',
  actions = [],
  meta = [],
  breadcrumbs = [],
  className = '',
} = {}) {
  return el('section', {
    className: ['page-hero', className].filter(Boolean).join(' '),
  }, [
    breadcrumbs.length
      ? el('div.page-hero__breadcrumbs', breadcrumbs.map((item) =>
        typeof item === 'string'
          ? el('span.page-hero__crumb', item)
          : el('span.page-hero__crumb', item.label)
      ))
      : null,
    el('div.page-hero__main', [
      el('div.page-hero__content', [
        eyebrow ? el('div.page-hero__eyebrow', eyebrow) : null,
        el('h1.page-hero__title', title),
        description ? el('p.page-hero__description', description) : null,
      ]),
      toChildren(actions).length ? el('div.page-hero__actions', toChildren(actions)) : null,
    ]),
    meta.length ? el('div.page-hero__meta', meta.map((item) => item)) : null,
  ]);
}

export function createEmptyState({
  title,
  description,
  action = null,
  className = '',
} = {}) {
  return el('div', {
    className: ['empty-state', className].filter(Boolean).join(' '),
  }, [
    el('div.empty-state__orb'),
    el('h3.empty-state__title', title),
    el('p.empty-state__description', description),
    ...toChildren(action),
  ]);
}

export function formatMoney(value, currency = '₽') {
  const formattedValue = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

  return currency ? `${formattedValue} ${currency}` : formattedValue;
}

export function formatLongDate(dateValue) {
  let value = format(new Date(dateValue), 'd MMMM yyyy');

  Object.entries(LONG_MONTH_NAMES).forEach(([source, target]) => {
    value = value.replace(source, target);
  });

  return value;
}

export function formatShortDate(dateValue) {
  return format(new Date(dateValue), 'dd.MM.yyyy');
}

export function getLatestTransaction(account) {
  const transactions = Array.isArray(account?.transactions) ? account.transactions : [];

  return transactions.reduce((latest, transaction) => {
    if (!latest) {
      return transaction;
    }

    return new Date(transaction.date) > new Date(latest.date) ? transaction : latest;
  }, null);
}

export function getLastTransactionLabel(account) {
  const lastTransaction = getLatestTransaction(account);

  if (!lastTransaction?.date) {
    return 'Нет операций';
  }

  return formatLongDate(lastTransaction.date);
}
