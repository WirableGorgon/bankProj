import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import { getBanks } from './Api';
import {
  createBadge,
  createEmptyState,
  createLoader,
  createPageHeader,
  createSectionCard,
  createStatus,
  hideStatus,
  setLoading,
  showStatus,
} from './ui';

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

export default async function map() {
  let mapInstance = null;
  const spin = createLoader('map-loader');
  const pageStatus = createStatus({ className: 'page-status' });
  const coverageMetric = createHeroMetric('ATM points');
  const networkMetric = createHeroMetric('Coverage');
  const statusMetric = createHeroMetric('Map status');
  const mapCanvas = el('div.map-canvas', { id: 'map' });
  const mapContainer = el('div.map-frame', [mapCanvas]);
  const note = el('div.button-row', [createBadge('ATM locator', 'info')]);

  const pageHeader = createPageHeader({
    eyebrow: 'ATM network',
    title: 'Карта банкоматов',
    description: 'Экран показывает покрытие банкоматов в виде отдельной premium surface с понятными fallback-состояниями и supporting copy.',
    meta: [coverageMetric.node, networkMetric.node, statusMetric.node],
  });

  async function initMap() {
    setLoading(spin, true);
    mapContainer.hidden = false;

    try {
      const [banksResponse, ymaps3] = await Promise.all([
        getBanks(),
        import('ymaps3'),
      ]);

      const banks = banksResponse.payload || [];

      if (!banks.length) {
        coverageMetric.set('0', 'Данные по банкоматам отсутствуют');
        networkMetric.set('Pending', 'Покрытие не определено');
        statusMetric.set('Empty', 'Список банкоматов пока пуст');
        mapContainer.replaceChildren(
          createEmptyState({
            title: 'Банкоматы пока не найдены',
            description: 'Сервис вернул пустой список точек. Попробуйте обновить данные сервера чуть позже.',
          })
        );
        showStatus(pageStatus, 'Список банкоматов пока пуст.', 'empty');
        return;
      }

      await ymaps3.ready;

      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3;
      mapInstance = new YMap(
        mapCanvas,
        {
          location: {
            center: [37.588144, 55.733842],
            zoom: 10,
          },
        },
        [
          new YMapDefaultSchemeLayer({}),
          new YMapDefaultFeaturesLayer({}),
        ]
      );

      const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');

      banks.forEach((bank) => {
        mapInstance.addChild(
          new YMapDefaultMarker({
            coordinates: [bank.lon, bank.lat],
          })
        );
      });

      coverageMetric.set(String(banks.length), 'Точек отображено на карте');
      networkMetric.set('Moscow', 'Базовый центрирование по Москве');
      statusMetric.set('Online', 'Карта и маркеры успешно загружены');
      hideStatus(pageStatus);
    } catch (error) {
      coverageMetric.set('0', 'Точки не были загружены');
      networkMetric.set('Unavailable', 'Проверьте доступность API и карт');
      statusMetric.set('Error', 'Экран карты сейчас недоступен');
      showStatus(
        pageStatus,
        'Карта сейчас недоступна. Попробуйте еще раз чуть позже.',
        'error'
      );
      mapContainer.replaceChildren(
        createEmptyState({
          title: 'Не удалось отрисовать карту',
          description: 'Похоже, внешний сервис карт или API банкоматов сейчас недоступен. После восстановления сервисов экран заработает без дополнительных изменений.',
        })
      );
    } finally {
      setLoading(spin, false);
    }
  }

  const mapCard = createSectionCard({
    eyebrow: 'Geography',
    title: 'ATM coverage map',
    description: 'Карта встроена в отдельную surface-панель и сохраняет поддержку error/empty fallback внутри того же дизайна.',
    className: 'span-12',
    content: [
      note,
      pageStatus,
      spin,
      mapContainer,
    ],
  });

  const screen = el('div.map-grid', [
    el('div.span-12', pageHeader),
    mapCard,
  ]);

  await initMap();

  return {
    content: [screen],
    cleanup() {
      if (mapInstance && typeof mapInstance.destroy === 'function') {
        mapInstance.destroy();
      }
    },
  };
}
