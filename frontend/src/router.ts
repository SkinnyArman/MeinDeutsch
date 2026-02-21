import { createRouter, createWebHistory } from "vue-router";
import DailyTalkView from "./components/DailyTalkView.vue";
import DailyTalkNewView from "./components/DailyTalkNewView.vue";
import DailyTalkDetailView from "./components/DailyTalkDetailView.vue";
import VocabularyView from "./components/VocabularyView.vue";
import SettingsHomeView from "./components/SettingsHomeView.vue";
import SettingsThemeView from "./components/SettingsThemeView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";
import KnowledgeBaseView from "./components/KnowledgeBaseView.vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/daily-talk" },
    { path: "/daily-talk", component: DailyTalkView },
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
