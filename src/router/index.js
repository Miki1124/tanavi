import { createRouter, createWebHashHistory } from 'vue-router';

import Map from '../views/Map.vue';
import Timetable from '../views/Timetable.vue';
import Zukan from '../views/Zukan.vue' 

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Map,
    },
    {
      path: '/zukan',
      name: 'Zukan',
      component: Zukan,   
    },
    {
      path: '/timetable',
      component: Timetable,
    },
  ],
});

export default router;
