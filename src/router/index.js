import { createRouter, createWebHashHistory } from 'vue-router';

import Map from '../views/Map.vue';
import Timetable from '../views/Timetable.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Map,
    },
    {
      path: '/timetable',
      component: Timetable,
    },
  ],
});

export default router;
