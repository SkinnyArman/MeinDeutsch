import { createRouter, createWebHistory } from "vue-router";
import LoginView from "./components/LoginView.vue";
import AlltagsspracheView from "./components/AlltagsspracheView.vue";
import DailyTalkView from "./components/DailyTalkView.vue";
import DailyTalkNewView from "./components/DailyTalkNewView.vue";
import DailyTalkDetailView from "./components/DailyTalkDetailView.vue";
import VocabularyView from "./components/VocabularyView.vue";
import SettingsHomeView from "./components/SettingsHomeView.vue";
import SettingsThemeView from "./components/SettingsThemeView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";
import KnowledgeBaseView from "./components/KnowledgeBaseView.vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";
import { getAuthToken } from "./utils/auth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginView, meta: { public: true } },
    { path: "/", redirect: "/daily-talk" },
    { path: "/daily-talk", component: DailyTalkView },
    { path: "/alltagssprache", component: AlltagsspracheView },
    { path: "/daily-talk/new", component: DailyTalkNewView },
    { path: "/daily-talk/:id", component: DailyTalkDetailView, props: true },
    { path: "/vocabulary", component: VocabularyView },
    { path: "/settings", component: SettingsHomeView },
    { path: "/settings/theme", component: SettingsThemeView },
    { path: "/settings/topics", component: TopicsQuestionsView },
    { path: "/settings/knowledge", component: KnowledgeBaseView },
    { path: "/settings/api", component: ApiTriggerView }
  ]
});

router.beforeEach((to) => {
  const token = getAuthToken();
  const isPublic = Boolean(to.meta.public);

  if (!isPublic && !token) {
    return "/login";
  }

  if (to.path === "/login" && token) {
    return "/daily-talk";
  }

  return true;
});
