import 'babel-polyfill';
import './style.scss';
import { el } from 'redom';
import * as ymaps3 from 'ymaps3';
import { getBanks } from './Api';

let token = localStorage.getItem('token');

export default function map() {
  document.getElementById('map-head-button').disabled = true;

  const spin = el('div.text-center', { id: 'spin', style: 'display: none!important;' }, [
    el('span.loader', 'QQ')
  ])

  const title = el('div.h1.exchange-h1', 'Карта банкоматов');
  const mainBlock = el('div.map', {id: 'map'});

  async function initMap() {
    await ymaps3.ready;

    const {YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer} = ymaps3;

    const map = new YMap(
        document.getElementById('map'),
        {
            location: {
                center: [37.588144, 55.733842],
                zoom: 10
            }
        },
        [
          new YMapDefaultSchemeLayer({}),
          new YMapDefaultFeaturesLayer({})
        ]
    );

    spin.style.display = '';

    const {YMapDefaultMarker} = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');

    getBanks().then((res) => {
      spin.style.display = 'none';
      for (const place of res.payload) {
        map.addChild(new YMapDefaultMarker({coordinates: [place.lon, place.lat]}))
      }
    })


    map.addChild(new YMapDefaultSchemeLayer());
  }

  initMap();

  return [
    title,
    spin,
    mainBlock,
  ]
}
