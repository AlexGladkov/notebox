import { createApp } from 'vue';
import './style.css';
import AppWrapper from './AppWrapper.vue';
import router from './router';

const app = createApp(AppWrapper);
app.use(router);
app.mount('#app');
