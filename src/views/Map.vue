<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
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
const nextClass = ref(null);

const classCardType = ref(null);
const showClassCard = ref(true);

const minutesUntilClass = ref(null);
const walkingMinutes = ref(null);
const userLocation = ref(null);

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
let classCheckTimer = null;
let previousClassCardKey = null;

const buildingMarkers = {};

const filteredBuildings = computed(() => {
  const trimmedKeyword = keyword.value.trim();

  if (trimmedKeyword === '') {
    return [];
  }

  return buildings.filter((building) => building.name.includes(trimmedKeyword));
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

/* 保存されている時間割を取得 */
const getSavedTimetable = () => {
  const savedTimetable = localStorage.getItem('timetable');

  if (!savedTimetable) {
    return [];
  }

  try {
    const timetable = JSON.parse(savedTimetable);

    return Array.isArray(timetable) ? timetable : [];
  } catch (error) {
    console.error('時間割データの読み込みに失敗しました', error);

    return [];
  }
};

/* カードに表示する授業 */
const displayedClass = computed(() => {
  return currentClass.value || nextClass.value;
});

/* カードに表示する授業の建物 */
const displayedBuilding = computed(() => {
  if (!displayedClass.value) {
    return null;
  }

  return buildings.find(
    (building) => building.name === displayedClass.value.building
  );
});

/* 現在地から授業の建物までの徒歩時間 */
const updateWalkingMinutes = () => {
  if (!map || !userLocation.value || !displayedBuilding.value) {
    walkingMinutes.value = null;
    return;
  }

  const distance = map.distance(userLocation.value, [
    displayedBuilding.value.lat,
    displayedBuilding.value.lng,
  ]);

  /*
    1分で約20m歩くとして計算
  */
  walkingMinutes.value = Math.max(1, Math.ceil(distance / 20));
};

/* 授業中・授業10分前を判定 */
const updateClassStatus = () => {
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

  const timetable = getSavedTimetable();

  currentClass.value = null;
  nextClass.value = null;
  classCardType.value = null;
  minutesUntilClass.value = null;

  /*
    現在授業中か確認
  */
  const activePeriod = classTimes.find((classTime) => {
    const start = convertToMinutes(classTime.start);
    const end = convertToMinutes(classTime.end);

    return currentMinutes >= start && currentMinutes < end;
  });

  if (activePeriod) {
    const lesson = timetable.find(
      (item) =>
        item.day === currentDay && Number(item.period) === activePeriod.period
    );

    if (lesson) {
      currentClass.value = {
        ...lesson,
        start: activePeriod.start,
        end: activePeriod.end,
      };

      classCardType.value = 'current';
    }
  }

  /*
    授業中でなければ、
    10分以内に始まる授業があるか確認
  */
  if (!currentClass.value) {
    for (const classTime of classTimes) {
      const start = convertToMinutes(classTime.start);

      const difference = start - currentMinutes;

      if (difference >= 0 && difference <= 10) {
        const lesson = timetable.find(
          (item) =>
            item.day === currentDay && Number(item.period) === classTime.period
        );

        if (lesson) {
          nextClass.value = {
            ...lesson,
            start: classTime.start,
            end: classTime.end,
          };

          classCardType.value = 'next';
          minutesUntilClass.value = difference;

          break;
        }
      }
    }
  }

  /*
    ×でカードを閉じていても、
    次の授業カードや授業中カードに切り替わったら
    再び表示する
  */
  const lesson = displayedClass.value;

  const newClassCardKey = lesson
    ? `${classCardType.value}-${currentDay}-${lesson.period}-${lesson.subject}`
    : null;

  if (newClassCardKey && newClassCardKey !== previousClassCardKey) {
    showClassCard.value = true;
  }

  previousClassCardKey = newClassCardKey;

  updateWalkingMinutes();
};

/* 選択していたピンの色を元に戻す */
const restoreSelectedMarkerIcon = () => {
  if (!selectedMarker) {
    return;
  }

  const selectedBuildingName = selectedMarker.options.buildingName;

  const destinationClass = displayedClass.value;

  const isClassBuilding =
    destinationClass && destinationClass.building === selectedBuildingName;

  selectedMarker.setIcon(isClassBuilding ? redIcon : blueIcon);
};

/* 建物へ移動 */
const moveToBuilding = (building) => {
  if (!map) {
    return;
  }

  map.setView([building.lat, building.lng], 19);

  restoreSelectedMarkerIcon();

  const marker = buildingMarkers[building.name];

  if (!marker) {
    return;
  }

  marker.setIcon(redIcon);
  marker.setPopupContent(createPopupContent(building));
  marker.openPopup();

  selectedMarker = marker;
  keyword.value = '';
};

/* 授業カードを押したとき */
const openClassBuilding = () => {
  if (!displayedBuilding.value) {
    return;
  }

  moveToBuilding(displayedBuilding.value);
};

/* ×ボタン */
const closeClassCard = () => {
  showClassCard.value = false;
};

/* ポップアップの中身 */
const createPopupContent = (building) => {
  const lesson = displayedClass.value;

  const isClassBuilding = lesson && lesson.building === building.name;

  let lessonInformation = '';

  if (isClassBuilding && currentClass.value) {
    lessonInformation = `
      現在の授業：${lesson.subject}<br>
      教室：${lesson.room}<br>
    `;
  }

  let distanceInformation = '';

  if (userLocation.value && map) {
    const distance = map.distance(userLocation.value, [
      building.lat,
      building.lng,
    ]);

    const walkMinutes = Math.max(1, Math.ceil(distance / 70));

    distanceInformation = `
      <br>
      距離：${Math.round(distance)}m<br>
      徒歩：約${walkMinutes}分
    `;
  }

  return `
    <div style="text-align:center;">
      <strong>${building.name}</strong><br>

      ${lessonInformation}

      ${
        building.photo
          ? `
            <img
              src="${building.photo}"
              alt="${building.name}"
              style="
                width:120px;
                border-radius:8px;
                margin-top:6px;
              "
            >
          `
          : ''
      }

      ${distanceInformation}
    </div>
  `;
};

onMounted(() => {
  updateClassStatus();

  /*
    1分ごとに授業状況を更新
  */
  classCheckTimer = window.setInterval(() => {
    updateClassStatus();
  }, 60 * 1000);

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

  window.setTimeout(() => {
    map.invalidateSize();
  }, 300);

  /*
    建物ピンを作成
  */
  buildings.forEach((building) => {
    const destinationClass = displayedClass.value;

    const isClassBuilding =
      destinationClass && destinationClass.building === building.name;

    const marker = L.marker([building.lat, building.lng], {
      icon: isClassBuilding ? redIcon : blueIcon,

      buildingName: building.name,
    })
      .addTo(map)
      .bindPopup(createPopupContent(building));

    marker.on('click', () => {
      marker.setPopupContent(createPopupContent(building));
    });

    marker.bindTooltip(building.name, {
      permanent: true,
      direction: 'top',
      offset: [0, -20],
    });

    buildingMarkers[building.name] = marker;
  });

  /*
    授業中または授業10分前なら
    授業の建物へ自動ズーム
  */
  if (displayedBuilding.value) {
    map.setView([displayedBuilding.value.lat, displayedBuilding.value.lng], 19);

    const marker = buildingMarkers[displayedBuilding.value.name];

    if (marker) {
      marker.setIcon(redIcon);
      marker.setPopupContent(createPopupContent(displayedBuilding.value));
      marker.openPopup();

      selectedMarker = marker;
    }
  }

  /*
    現在地を取得
  */
  map.locate({
    setView: false,

    enableHighAccuracy: true,
  });

  map.on('locationfound', (e) => {
    userLocation.value = e.latlng;

    const latitude = e.latlng.lat;

    const longitude = e.latlng.lng;

    const insideCampus = isInsideCampus(
      latitude,

      longitude
    );

    /*

      現在地は青丸

    */

    L.circleMarker(e.latlng, {
      radius: 8,

      color: '#ffffff',

      fillColor: '#3388ff',

      fillOpacity: 1,

      weight: 3,
    })

      .addTo(map)

      .bindPopup('現在地');

    /*

      現在地の精度を示す円

    */

    L.circle(e.latlng, {
      radius: e.accuracy,

      color: '#3388ff',

      fillOpacity: 0.08,
    }).addTo(map);

    updateWalkingMinutes();

    /*

      授業カードがない場合だけ

      現在地へ移動

    */

    if (!displayedClass.value) {
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
    if (!displayedClass.value) {
      locationMessage.value = '現在地を取得できませんでした';

      map.setView(campusCenter, 16);
    }

    console.log(
      '現在地取得失敗:',

      e.message
    );
  });

  L.control.scale().addTo(map);
});

onUnmounted(() => {
  if (classCheckTimer) {
    window.clearInterval(classCheckTimer);
  }

  if (map) {
    map.remove();
  }
});
</script>

<template>
  <div class="app-shell">
    <!-- ヘッダー -->
    <header class="app-header">
      <h1 class="app-title">
        <span class="app-logo">✤</span>
        田なび
      </h1>
    </header>

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

    <main class="map-area">
      <!-- 授業カード -->
      <div
        v-if="classCardType && displayedClass && showClassCard"
        class="class-card"
        role="button"
        tabindex="0"
        @click="openClassBuilding"
        @keydown.enter="openClassBuilding"
      >
        <button class="class-card-close" @click.stop="closeClassCard">×</button>

        <!-- 次の授業 -->
        <template v-if="classCardType === 'next'">
          <div class="class-card-title">📚 次の授業</div>

          <div class="class-card-period">
            {{ displayedClass.period }}限 （{{ displayedClass.start }}〜{{
              displayedClass.end
            }}）
          </div>

          <div class="class-card-subject">
            {{ displayedClass.subject }}
          </div>

          <div class="class-card-room">
            {{ displayedClass.building }}
            {{ displayedClass.room }}
          </div>

          <div class="class-card-info">
            🕒 あと{{ minutesUntilClass }}分で開始
          </div>

          <div v-if="walkingMinutes" class="class-card-info">
            🚶 徒歩{{ walkingMinutes }}分
          </div>
        </template>

        <!-- 授業中 -->
        <template v-else>
          <div class="class-card-title">🟢 授業中</div>

          <div class="class-card-message">
            現在、

            {{ displayedClass.building }}
            {{ displayedClass.room }}

            <br />

            「{{ displayedClass.subject }}」 の授業中
          </div>

          <div v-if="walkingMinutes" class="class-card-info">
            🚶 徒歩{{ walkingMinutes }}分
          </div>
        </template>

        <div class="class-card-hint">📍 タップして地図で確認</div>
      </div>

      <!-- 授業がない時 -->
      <div v-else class="location-status">
        <span class="location-pin"> ● </span>

        {{ locationMessage }}
      </div>

      <!-- 地図 -->
      <div id="map"></div>

      <!-- 工事情報 -->
      <a
        href="https://doshisha-vision2025.jp/anniversary/kyotanabe/schedule/"
        target="_blank"
        rel="noopener noreferrer"
        class="construction-button"
      >
        🚧 工事情報
        <span>↑</span>
      </a>
    </main>
  </div>
</template>

<style>
/* ===== 授業カード ===== */

.class-card {
  position: absolute;
  top: 16px;
  left: 16px;

  width: min(320px, calc(100% - 90px));

  padding: 18px 18px 16px;

  background: rgba(248, 244, 255, 0.97);

  border: 1px solid #dcc7ff;

  border-radius: 18px;

  box-shadow: 0 8px 22px rgba(73, 44, 128, 0.12);

  z-index: 1000;

  cursor: pointer;

  transition: 0.18s;
}

.class-card:hover {
  transform: translateY(-2px);
}

.class-card:active {
  transform: scale(0.985);
}

.class-card-close {
  position: absolute;

  top: 10px;

  right: 12px;

  width: 28px;

  height: 28px;

  border: none;

  background: transparent;

  font-size: 22px;

  color: #8461c9;

  cursor: pointer;
}

.class-card-close:hover {
  color: #5f37b4;
}

.class-card-title {
  margin-bottom: 12px;

  font-size: 17px;

  font-weight: 700;

  color: #6d43bd;
}

.class-card-period {
  margin-bottom: 10px;

  font-size: 14px;

  color: #666;
}

.class-card-subject {
  font-size: 21px;

  font-weight: bold;

  color: #2d2d2d;
}

.class-card-room {
  margin-top: 4px;

  margin-bottom: 12px;

  font-size: 15px;

  color: #555;
}

.class-card-message {
  margin-bottom: 14px;

  line-height: 1.7;

  font-size: 15px;
}

.class-card-info {
  margin-top: 6px;

  font-size: 14px;

  font-weight: 600;

  color: #5a5a5a;
}

.class-card-hint {
  margin-top: 14px;

  padding-top: 10px;

  border-top: 1px solid #ece4ff;

  font-size: 12px;

  color: #9073cb;
}

/* ===== モバイル ===== */

@media (max-width: 768px) {
  .class-card {
    width: calc(100% - 90px);

    left: 15px;

    top: 15px;
  }

  .class-card-subject {
    font-size: 19px;
  }
}
</style>
