<script setup>
import { ref, watch } from 'vue';
import { buildings } from '../buildingsData.js';

const days = [
  '月曜日',
  '火曜日',
  '水曜日',
  '木曜日',
  '金曜日',
  '土曜日',
  '日曜日',
];

const periods = [1, 2, 3, 4, 5, 6, 7];

/* 保存済み時間割を読み込む */
const loadTimetable = () => {
  const savedTimetable = localStorage.getItem('timetable');

  if (!savedTimetable) return [];

  try {
    return JSON.parse(savedTimetable);
  } catch (error) {
    console.error('時間割の読み込みに失敗しました', error);
    return [];
  }
};

const timetable = ref(loadTimetable());

const selectedDay = ref('');
const selectedPeriod = ref('');
const subject = ref('');
const building = ref('');
const room = ref('');

/* 時間割が変わるたびに保存 */
watch(
  timetable,
  (newTimetable) => {
    localStorage.setItem('timetable', JSON.stringify(newTimetable));
  },
  {
    deep: true,
  }
);

/* 入力フォームを開く */
const openForm = (day, period) => {
  selectedDay.value = day;
  selectedPeriod.value = period;

  const registeredClass = getClass(day, period);

  if (registeredClass) {
    subject.value = registeredClass.subject;
    building.value = registeredClass.building;
    room.value = registeredClass.room;
  } else {
    subject.value = '';
    building.value = '';
    room.value = '';
  }
};

/* 授業を登録 */
const addClass = () => {
  if (!subject.value.trim() || !building.value || !room.value.trim()) {
    alert('授業名・建物・教室をすべて入力してください');
    return;
  }

  timetable.value = timetable.value.filter(
    (item) =>
      !(
        item.day === selectedDay.value &&
        Number(item.period) === Number(selectedPeriod.value)
      )
  );

  timetable.value.push({
    day: selectedDay.value,
    period: Number(selectedPeriod.value),
    subject: subject.value.trim(),
    building: building.value,
    room: room.value.trim(),
  });

  closeForm();
};

/* フォームを閉じる */
const closeForm = () => {
  selectedDay.value = '';
  selectedPeriod.value = '';
  subject.value = '';
  building.value = '';
  room.value = '';
};

/* 指定された曜日・時限の授業を取得 */
const getClass = (day, period) => {
  return timetable.value.find(
    (item) => item.day === day && Number(item.period) === Number(period)
  );
};

/* 授業を削除 */
const deleteClass = (day, period) => {
  timetable.value = timetable.value.filter(
    (item) => !(item.day === day && Number(item.period) === Number(period))
  );

  if (
    selectedDay.value === day &&
    Number(selectedPeriod.value) === Number(period)
  ) {
    closeForm();
  }
};

/* 時間割を全部消す */
const clearTimetable = () => {
  const result = confirm('登録した時間割をすべて削除しますか？');

  if (!result) return;

  timetable.value = [];
  closeForm();
};
</script>

<template>
  <div class="page">
    <header class="top-header">
      <router-link to="/" class="back-button">
        <span class="back-icon">←</span>
        <span>地図に戻る</span>
      </router-link>

      <button
        v-if="timetable.length"
        class="clear-button"
        @click="clearTimetable"
      >
        全削除
      </button>
    </header>

    <section class="title-area">
      <p class="sub-title">田なび</p>

      <h1>
        <span class="title-icon">📅</span>
        時間割
      </h1>

      <p class="description">
        登録したいマスを押して、授業情報を入力してください。
      </p>
    </section>

    <main class="timetable-container">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="day-heading timetable-corner"></th>

              <th v-for="period in periods" :key="period">
                <span class="period-number">{{ period }}</span>
                <span class="period-label">限</span>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="day in days" :key="day">
              <th class="day-heading">
                {{ day }}
              </th>

              <td
                v-for="period in periods"
                :key="period"
                @click="openForm(day, period)"
              >
                <div v-if="getClass(day, period)" class="timetable-class-card">
                  <strong class="subject-name">
                    {{ getClass(day, period).subject }}
                  </strong>

                  <span class="class-info building-name">
                    {{ getClass(day, period).building }}
                  </span>

                  <span class="class-info room-info">
                    {{ getClass(day, period).room }}
                  </span>

                  <button
                    class="delete-button"
                    @click.stop="deleteClass(day, period)"
                  >
                    削除
                  </button>
                </div>
                <div v-else class="empty-cell">
                  <span class="plus">＋</span>
                  <span class="add-text">授業を追加</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="scroll-guide">横にスクロールして時間割を確認できます</p>
    </main>

    <div v-if="selectedDay" class="form-overlay" @click.self="closeForm">
      <div class="form">
        <div class="form-header">
          <div>
            <p class="form-subtitle">授業情報を入力</p>

            <h2>
              {{ selectedDay }}
              {{ selectedPeriod }}限
            </h2>
          </div>

          <button class="close-icon" @click="closeForm">×</button>
        </div>

        <div class="input-group">
          <label for="subject"> 授業名 </label>

          <input
            id="subject"
            v-model="subject"
            type="text"
            placeholder="例：文化情報学"
          />
        </div>

        <div class="input-group">
          <label for="building"> 建物 </label>

          <select id="building" v-model="building">
            <option value="">建物を選択</option>

            <option
              v-for="buildingItem in buildings"
              :key="buildingItem.name"
              :value="buildingItem.name"
            >
              {{ buildingItem.name }}
            </option>
          </select>
        </div>

        <div class="input-group">
          <label for="room"> 教室 </label>

          <input
            id="room"
            v-model="room"
            type="text"
            placeholder="例：201"
            @keyup.enter="addClass"
          />
        </div>

        <div class="form-buttons">
          <button class="add-button" @click="addClass">登録する</button>

          <button class="cancel-button" @click="closeForm">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 24px;
  background: radial-gradient(
      circle at top right,
      rgba(170, 140, 207, 0.2),
      transparent 35%
    ),
    linear-gradient(180deg, #fbf9fd 0%, #f2ecf8 100%);
  color: #332843;
  font-family: 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1180px;
  margin: 0 auto 28px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #674793;
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s, transform 0.2s;
}

.back-button:hover {
  color: #4f3278;
  transform: translateX(-3px);
}

.back-icon {
  font-size: 20px;
}

.clear-button {
  padding: 9px 16px;
  border: 1px solid #d9cbed;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #674793;
  box-shadow: 0 4px 14px rgba(80, 50, 120, 0.08);
  cursor: pointer;
  font-weight: 700;
  transition: background 0.2s, transform 0.2s;
}

.clear-button:hover {
  background: #f3edf9;
  transform: translateY(-1px);
}

.title-area {
  max-width: 1180px;
  margin: 0 auto 24px;
}

.sub-title {
  margin: 0 0 6px;
  color: #9987ae;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  color: #533479;
  font-family: 'Yu Mincho', 'Hiragino Mincho ProN', serif;
  font-size: 36px;
  letter-spacing: 0.04em;
}

.title-icon {
  font-family: sans-serif;
  font-size: 31px;
}

.description {
  margin: 0;
  color: #756a82;
  font-size: 15px;
  line-height: 1.7;
}

.timetable-container {
  max-width: 1180px;
  margin: 0 auto;
}

.table-wrap {
  overflow-x: auto;
  padding: 8px 4px 18px;
  border-radius: 24px;
}

table {
  width: 100%;
  min-width: 1040px;
  overflow: hidden;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e5dbf1;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 45px rgba(82, 52, 121, 0.12),
    0 3px 10px rgba(82, 52, 121, 0.05);
}

th,
td {
  box-sizing: border-box;
  min-width: 125px;
  height: 118px;
  padding: 9px;
  border-right: 1px solid #e9e0f3;
  border-bottom: 1px solid #e9e0f3;
  text-align: center;
}

tr:last-child th,
tr:last-child td {
  border-bottom: none;
}

th:last-child,
td:last-child {
  border-right: none;
}

thead th {
  height: 66px;
  background: linear-gradient(180deg, #e5d8f3 0%, #dac8ed 100%);
  color: #56367e;
  font-weight: 800;
}

.period-number {
  font-size: 20px;
}

.period-label {
  margin-left: 2px;
  font-size: 13px;
}

.day-heading {
  min-width: 96px;
  background: #eee6f6;
  color: #5c4278;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.timetable-corner {
  background: #d8c5ec;
}

td {
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  vertical-align: middle;
  transition: background 0.2s, box-shadow 0.2s;
}

td:hover {
  background: #f8f3fc;
  box-shadow: inset 0 0 0 2px #d8c5ec;
}
.empty-cell {
  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  min-height: 92px;

  color: #ae9cbe;
}

.plus {
  color: #8061a8;

  font-size: 30px;

  font-weight: 300;

  line-height: 1;
}

.add-text {
  margin-top: 5px;

  font-size: 11px;

  opacity: 0;

  transition: opacity 0.2s;
}

td:hover .add-text {
  opacity: 1;
}

.timetable-classcard {
  display: flex;

  flex-direction: column;

  gap: 5px;

  min-height: 88px;

  padding: 9px;

  border: 1px solid #e4d7f2;

  border-radius: 14px;

  background: linear-gradient(
    145deg,
    #ffffff 0%,

    #f7f1fc 100%
  );

  box-shadow: 0 4px 13px rgba(85, 55, 125, 0.09);

  font-size: 12px;

  overflow-wrap: anywhere;
}

.subject-name {
  display: block;
  width: 100%;
  color: #55347b;
  font-size: 19px;
  line-height: 1.4;
  white-space: nowrap;
  text-align: center;
}

.class-info {
  color: #756681;

  line-height: 1.35;
}

.room-info {
  font-weight: 700;
}

.delete-button {
  align-self: center;

  margin-top: auto;

  padding: 5px 12px;

  border: none;

  border-radius: 999px;

  background: #eee4f8;

  color: #694791;

  cursor: pointer;

  font-size: 11px;

  font-weight: 700;

  transition: background 0.2s, color 0.2s;
}

.delete-button:hover {
  background: #68468f;

  color: white;
}

.scroll-guide {
  display: none;

  margin: 4px 0 0;

  color: #8d7c9e;

  font-size: 12px;

  text-align: center;
}

.form-overlay {
  position: fixed;

  z-index: 2000;

  inset: 0;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background: rgba(45, 28, 67, 0.38);

  backdrop-filter: blur(5px);
}

.form {
  box-sizing: border-box;

  display: flex;

  flex-direction: column;

  gap: 17px;

  width: 100%;

  max-width: 430px;

  padding: 26px;

  border: 1px solid rgba(226, 215, 241, 0.95);

  border-radius: 24px;

  background: rgba(255, 255, 255, 0.98);

  box-shadow: 0 24px 60px rgba(42, 24, 66, 0.24);

  animation: form-appear 0.18s ease-out;
}

@keyframes form-appear {
  from {
    opacity: 0;

    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;

    transform: translateY(0) scale(1);
  }
}

.form-header {
  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  gap: 16px;
}

.form-subtitle {
  margin: 0 0 4px;

  color: #9c8aad;

  font-size: 12px;

  font-weight: 700;
}

.form h2 {
  margin: 0;

  color: #55347b;

  font-size: 24px;
}

.close-icon {
  display: flex;

  align-items: center;

  justify-content: center;

  width: 34px;

  height: 34px;

  border: none;

  border-radius: 50%;

  background: #f1ebf7;

  color: #685176;

  cursor: pointer;

  font-size: 22px;

  line-height: 1;
}

.input-group {
  display: flex;

  flex-direction: column;

  gap: 7px;
}

label {
  color: #544960;

  font-size: 14px;

  font-weight: 800;
}

input,
select {
  box-sizing: border-box;

  width: 100%;

  padding: 12px 13px;

  border: 2px solid #dfd3ee;

  border-radius: 13px;

  outline: none;

  background: #fefeff;

  color: #332843;

  font-family: inherit;

  font-size: 15px;

  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
select:focus {
  border-color: #8060a8;

  box-shadow: 0 0 0 4px rgba(128, 96, 168, 0.12);
}

.form-buttons {
  display: flex;

  gap: 10px;

  margin-top: 4px;
}

.add-button,
.cancel-button {
  flex: 1;

  padding: 12px 15px;

  border: none;

  border-radius: 13px;

  cursor: pointer;

  font-family: inherit;

  font-size: 14px;

  font-weight: 800;

  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.add-button {
  background: linear-gradient(
    135deg,
    #76529f 0%,

    #5a397f 100%
  );

  color: white;

  box-shadow: 0 7px 16px rgba(88, 54, 127, 0.22);
}

.add-button:hover {
  transform: translateY(-1px);

  box-shadow: 0 9px 20px rgba(88, 54, 127, 0.28);
}

.cancel-button {
  background: #f0ebf5;

  color: #5d5267;
}

.cancel-button:hover {
  background: #e7dfef;
}

@media (max-width: 600px) {
  .page {
    padding: 17px 14px 28px;
  }

  .top-header {
    margin-bottom: 24px;
  }

  .back-button {
    font-size: 14px;
  }

  .clear-button {
    padding: 8px 13px;

    font-size: 12px;
  }

  h1 {
    font-size: 29px;
  }

  .title-icon {
    font-size: 26px;
  }

  .description {
    font-size: 13px;
  }

  .table-wrap {
    margin-right: -14px;

    margin-left: -14px;

    padding-right: 14px;

    padding-left: 14px;

    border-radius: 0;
  }

  .scroll-guide {
    display: block;
  }

  .form {
    padding: 22px;

    border-radius: 21px;
  }

  .form-buttons {
    flex-direction: column;
  }

  .add-button,
  .cancel-button {
    width: 100%;
  }
}
</style>
