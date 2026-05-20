import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import AppWrapper from './AppWrapper.vue';
import router from './router';

const app = createApp(AppWrapper);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount('#app');
