import { createRouter, createWebHistory } from "vue-router";
import LoginView from "./components/LoginView.vue";
import DashboardView from "./components/DashboardView.vue";
import AlltagsspracheView from "./components/AlltagsspracheView.vue";
import AlltagsspracheReviewView from "./components/AlltagsspracheReviewView.vue";
import KollokationenView from "./components/KollokationenView.vue";
import KollokationenReviewView from "./components/KollokationenReviewView.vue";
import GespraechView from "./components/GespraechView.vue";
import ProgressView from "./components/ProgressView.vue";
import DailyTalkView from "./components/DailyTalkView.vue";
import DailyTalkNewView from "./components/DailyTalkNewView.vue";
import DailyTalkDetailView from "./components/DailyTalkDetailView.vue";
import VocabularyView from "./components/VocabularyView.vue";
import VocabularyReviewView from "./components/VocabularyReviewView.vue";
import SettingsHomeView from "./components/SettingsHomeView.vue";
import SettingsThemeView from "./components/SettingsThemeView.vue";
import SettingsLevelView from "./components/SettingsLevelView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";
import KnowledgeBaseView from "./components/KnowledgeBaseView.vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";
import { getAuthToken } from "./utils/auth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginView, meta: { public: true } },
    { path: "/", component: DashboardView },
    { path: "/writing", component: DailyTalkView },
    { path: "/alltagssprache", component: AlltagsspracheView },
    { path: "/alltagssprache/review", component: AlltagsspracheReviewView },
    { path: "/kollokationen", component: KollokationenView },
    { path: "/kollokationen/review", component: KollokationenReviewView },
    { path: "/gespraech", component: GespraechView },
    { path: "/progress", component: ProgressView },
    { path: "/writing/new", component: DailyTalkNewView },
    { path: "/writing/:id", component: DailyTalkDetailView, props: true },
    { path: "/vocabulary", component: VocabularyView },
    { path: "/vocabulary/review", component: VocabularyReviewView },
    { path: "/settings", component: SettingsHomeView },
    { path: "/settings/theme", component: SettingsThemeView },
    { path: "/settings/level", component: SettingsLevelView },
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
    return "/";
  }

  // The placement exam is enforced as a blocking modal in App.vue (not a route).
  return true;
});
