import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./libs/i18n";
import { VueQueryPlugin, vueQueryOptions } from "./libs/query";
import "./style.css";

createApp(App)
  .use(router)
  .use(VueQueryPlugin, vueQueryOptions)
  .use(i18n)
  .mount("#app");
