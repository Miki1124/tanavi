<template>
<div class="distance-page">
  <h2>移動距離の計測</h2>

  <p>現在の移動距離：{{ distance.toFixed(2) }} km</p>

  <button @click="startTracking">計測開始</button>
  <button @click="stopTracking">停止</button>
</div>
</template>

<script>
export default {
  data() {
    return {
      watchId: null,
      lastPosition: null,
      distance: 0
      todayDistance: 0, 
    todayDate: "" 
    }
  },

  methods: {
    startTracking() {
      if (!navigator.geolocation) {
        alert("位置情報が使えません");
        return;
      }

      this.watchId = navigator.geolocation.watchPosition(
        this.updatePosition,
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    },

    stopTracking() {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
    },

    updatePosition(pos) {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      if (this.lastPosition) {
        const d = this.calcDistance(
          this.lastPosition.lat,
          this.lastPosition.lon,
          lat,
          lon
        );
        this.distance += d;       
        this.todayDistance += d;  
        localStorage.setItem("distance_today", this.todayDistance);
      }

      this.lastPosition = { lat, lon };
    },

    
    calcDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000; 
      const toRad = (v) => (v * Math.PI) / 180;

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;

      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }
}

mounted() {
  const savedDate = localStorage.getItem("distance_date");
  const savedDistance = localStorage.getItem("distance_today");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (savedDate === today) {
    this.todayDistance = Number(savedDistance || 0);
  } else {
    this.todayDistance = 0;
    localStorage.setItem("distance_date", today);
    localStorage.setItem("distance_today", 0);
  }

  this.todayDate = today;
}

</script>
