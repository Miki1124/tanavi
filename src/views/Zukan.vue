<template>
<div class="zukan-page">

  <!-- タイトル -->
  <h2 class="zukan-title">図鑑</h2>

  <!-- 今日の移動距離（補足テキスト） -->
  <div class="today-distance">
    今日の移動距離：{{ (todayDistance / 1000).toFixed(2) }} km
  </div>

  <div class="today-distance">
    男性の消費カロリー：{{ maleCalorie.toFixed(0) }} kcal
  </div>

  <div class="today-distance">
    女性の消費カロリー：{{ femaleCalorie.toFixed(0) }} kcal
  </div>

  <!-- 図鑑グリッド -->
  <div class="zukan-grid">
    <div 
      v-for="badge in badges" 
      :key="badge.id" 
      class="badge-item"
      :class="{ unlocked: badge.unlocked }"
    >
      <p class="badge-name">{{ badge.name }}</p>
      <p class="badge-desc">{{ badge.desc }}</p>
    </div>
  </div>

  <router-link to="/" class="back-button">
    ←地図に戻る
  </router-link>

</div>
</template>

<script>
import badgeList from "../data/badgeList.js";

export default {
data() {
  return {
    badges: [],
    todayDistance: 0,
    maleCalorie:0,
    femaleCalorie:0
  }
},

mounted() {
  const savedDistance = Number(localStorage.getItem("distance_today") || 0);
  this.todayDistance = savedDistance;

  const km = savedDistance / 1000; 

  this.maleCalorie = km * 63 * 1.05;
  this.femaleCalorie = km * 50 * 1.05;

  this.badges = badgeList.map(b => ({
    ...b,
    unlocked: savedDistance / 1000 >= b.requireKm
  }));
}
}
</script>

<style>
/* ページ全体 */
.zukan-page {
padding: 20px;
font-family: "Meiryo";
background-image: url("/wood-bg.jpg"); /* 木の背景 */
background-size: cover;
min-height: 100vh;
}

/* タイトル */
.zukan-title {
font-size: 20px;
font-weight: 600;
margin-left: 16px;
color: #111;
}

/* 補足テキスト（舞桜さんの設定を完全反映） */
.today-distance {
font-family: "Meiryo";
font-size: 14px;
font-weight: 300; /* 細め */
color: #111; /* 柔らかい黒 */
margin-left: 16px; /* 左右16px寄せ */
margin-right: 16px;
margin-top: 4px; /* 4px上寄せ */
margin-bottom: 8px; /* 下余白少なめ */
}

/* 図鑑グリッド */
.zukan-grid {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 16px;
padding: 16px;
}

/* バッジアイテム */
.badge-item {
text-align: center;
opacity: 0.4; /* 未解放は薄く */
}

.badge-item.unlocked {
opacity: 1; /* 解放済みはくっきり */
}

.badge-icon {
width: 64px;
height: 64px;
}

.badge-name {
font-size: 14px;
color: #111;
margin-top: 8px;
}

.badge-desc {
font-size: 12px;
color: #555;
}

.back-button {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 120px; /* 図鑑は文字が長いので少し広め */
  height: 48px;
  color: var(--purple-dark);
  background: var(--white);
  border: 2px solid var(--purple-main);
  border-radius: 15px;
  box-shadow: 0 6px 16px rgba(62, 32, 96, 0.17);
  text-decoration: none;
  font-size: 18px;
  font-weight: 700;
  margin: 20px auto; /* 図鑑ページの中央に配置 */
}

</style>
