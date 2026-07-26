<script setup>
import { onMounted, ref, computed } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buildings } from '../buildingsData.js';

const blueIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const keyword = ref('');
const locationMessage = ref('現在地を確認しています');
const currentClass = ref(null);

const campusCenter = [34.801, 135.771];

const campusBounds = {
  north: 34.806,
  south: 34.796,
  east: 135.778,
  west: 135.764,
};

const isInsideCampus = (lat, lng) => {
  return (
    lat <= campusBounds.north &&
    lat >= campusBounds.south &&
    lng <= campusBounds.east &&
    lng >= campusBounds.west
  );
};

let map;
let selectedMarker = null;

const buildingMarkers = {};

const filteredBuildings = computed(() => {
  if (keyword.value === '') return [];

  return buildings.filter((building) => building.name.includes(keyword.value));
});

/* 授業時間 */
const classTimes = [
  { period: 1, start: '9:00', end: '10:45' },
  { period: 2, start: '10:45', end: '12:15' },
  { period: 3, start: '13:10', end: '14:40' },
  { period: 4, start: '14:55', end: '16:25' },
  { period: 5, start: '16:40', end: '18:10' },
  { period: 6, start: '18:25', end: '19:55' },
  { period: 7, start: '20:10', end: '21:40' },
];

const convertToMinutes = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

/* 今の時間の授業を取得 */
const getCurrentClass = () => {
  const now = new Date();

  const dayNames = [
    '日曜日',
    '月曜日',
    '火曜日',
    '水曜日',
    '木曜日',
    '金曜日',
    '土曜日',
  ];

  const currentDay = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const currentPeriod = classTimes.find((classTime) => {
    const start = convertToMinutes(classTime.start);
    const end = convertToMinutes(classTime.end);

    return currentMinutes >= start && currentMinutes <= end;
  });

  if (!currentPeriod) return null;

  const savedTimetable = localStorage.getItem('timetable');

  if (!savedTimetable) return null;

  try {
    const timetable = JSON.parse(savedTimetable);

    return (
      timetable.find(
        (item) =>
          item.day === currentDay &&
          Number(item.period) === currentPeriod.period
      ) || null
    );
  } catch (error) {
    console.error('時間割データの読み込みに失敗しました', error);
    return null;
  }
};

/* 検索した建物へ移動 */
const moveToBuilding = (building) => {
  map.setView([building.lat, building.lng], 19);

  if (selectedMarker) {
    const selectedBuildingName = selectedMarker.options.buildingName;

    const isCurrentClassBuilding =
      currentClass.value &&
      currentClass.value.building === selectedBuildingName;

    selectedMarker.setIcon(isCurrentClassBuilding ? redIcon : blueIcon);
  }

  const marker = buildingMarkers[building.name];

  if (!marker) return;

  marker.setIcon(redIcon);
  marker.openPopup();

  selectedMarker = marker;
  keyword.value = '';
};

onMounted(() => {
  currentClass.value = getCurrentClass();

  if (currentClass.value) {
    locationMessage.value = `現在、${currentClass.value.subject}の授業中です`;
  }

  map = L.map('map', {
    minZoom: 15,
    maxZoom: 20,
  }).setView(campusCenter, 16);

  L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    {
      attribution: '© 国土地理院',
      maxNativeZoom: 18,
      maxZoom: 20,
    }
  ).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 300);

  /* 建物ピン */
  buildings.forEach((building) => {
    const isCurrentClassBuilding =
      currentClass.value && currentClass.value.building === building.name;

    const popupBase = isCurrentClassBuilding
      ? `
          <strong>${building.name}</strong><br>
          現在の授業：${currentClass.value.subject}<br>
          教室：${currentClass.value.room}<br>
        `
      : `
          <strong>${building.name}</strong><br>
        `;

    const popupWithPhoto = `
      <div style="text-align:center;">
        ${popupBase}

        ${
          building.photo
            ? `
              <img
                src="${building.photo}"
                style="
                  width:120px;
                  border-radius:8px;
                  margin-top:6px;
                "
              >
            `
            : ''
        }
      </div>
    `;

    const marker = L.marker([building.lat, building.lng], {
      icon: isCurrentClassBuilding ? redIcon : blueIcon,
      buildingName: building.name,
    })
      .addTo(map)
      .bindPopup(popupWithPhoto);

    marker.on('click', () => {
      if (!map._lastCenter) return;

      const userLocation = map._lastCenter;

      const distance = map.distance(userLocation, [building.lat, building.lng]);

      const walkMinutes = Math.max(1, Math.ceil(distance / 70));

      marker.setPopupContent(`
        <div style="text-align:center;">
          ${popupBase}

          ${
            building.photo
              ? `
                <img
                  src="${building.photo}"
                  style="
                    width:120px;
                    border-radius:8px;
                    margin-top:6px;
                  "
                >
              `
              : ''
          }

          <br>
          距離：${Math.round(distance)}m<br>
          徒歩：約${walkMinutes}分
        </div>
      `);
    });

    marker.bindTooltip(building.name, {
      permanent: true,
      direction: 'top',
      offset: [0, -20],
    });

    buildingMarkers[building.name] = marker;
  });

  /* 授業中なら、その建物へ自動ズーム */
  if (currentClass.value) {
    const currentBuilding = buildings.find(
      (building) => building.name === currentClass.value.building
    );

    if (currentBuilding) {
      map.setView([currentBuilding.lat, currentBuilding.lng], 19);

      const marker = buildingMarkers[currentBuilding.name];

      if (marker) {
        marker.setIcon(redIcon);
        marker.openPopup();
      }
    }
  }

  /* 現在地を取得 */
  map.locate({
    setView: false,
    enableHighAccuracy: true,
  });

  map.on('locationfound', (e) => {
    map._lastCenter = e.latlng;

    const latitude = e.latlng.lat;
    const longitude = e.latlng.lng;

    const insideCampus = isInsideCampus(latitude, longitude);

    L.circleMarker(e.latlng, {
      radius: 8,
      color: '#ffffff',
      fillColor: '#3388ff',
      fillOpacity: 1,
      weight: 3,
    })
      .addTo(map)
      .bindPopup('現在地');

    L.circle(e.latlng, {
      radius: e.accuracy,
      color: '#3388ff',
      fillOpacity: 0.08,
    }).addTo(map);

    /*
      授業中は授業の建物を表示したままにする。
      授業がない場合だけ現在地へ移動する。
    */
    if (!currentClass.value) {
      if (insideCampus) {
        locationMessage.value = '現在、校内にいます';
        map.setView(e.latlng, 18);
      } else {
        locationMessage.value = '現在、校舎外です';
        map.setView(campusCenter, 16);
      }
    }
  });

  map.on('locationerror', (e) => {
    if (!currentClass.value) {
      locationMessage.value = '現在地を取得できませんでした';

      map.setView(campusCenter, 16);
    }

    console.log('現在地取得失敗:', e.message);
  });

  L.control.scale().addTo(map);
});
</script>

<template>
  <div class="app-shell">
    <!-- 上部ヘッダー -->
    <header class="app-header">
      <h1 class="app-title">
        <span class="app-logo">✤</span>
        田なび
      </h1>
    </header>

    <!-- 検索欄 -->
    <!-- 検索欄 -->
    <div class="search-area">
      <div class="search-box">
        <span class="search-icon">⌕</span>

        <input v-model="keyword" type="text" placeholder="建物名を検索" />

        <div v-if="filteredBuildings.length" class="search-result">
          <button
            v-for="building in filteredBuildings"
            :key="building.name"
            class="result-item"
            type="button"
            @click="moveToBuilding(building)"
          >
            {{ building.name }}
          </button>
        </div>
      </div>

      <router-link
        to="/timetable"
        class="timetable-button"
        aria-label="時間割を開く"
      >
        <span class="timetable-icon">📅</span>
        <span class="timetable-label">時間割</span>
      </router-link>
    </div>

    <!-- 地図 -->
    <main class="map-area">
      <div class="location-status">
        <span class="location-pin" :class="{ 'class-active': currentClass }">
          ●
        </span>

        {{ locationMessage }}
      </div>

      <div id="map"></div>

      <a
        href="https://doshisha-vision2025.jp/anniversary/kyotanabe/schedule/"
        target="_blank"
        rel="noopener noreferrer"
        class="construction-button"
      >
        🚧 工事情報
        <span>↗</span>
      </a>
    </main>
  </div>
</template>

<style>
/* ここには今使っているCSSをそのまま残してOK */
</style>
