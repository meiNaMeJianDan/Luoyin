import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import GameDetail from "./pages/GameDetail";
import BeginnersGuide from "./pages/BeginnersGuide";
import Trending from "./pages/Trending";
import About from "./pages/About";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import GamesManage from "./pages/admin/GamesManage";
import GameDetailManage from "./pages/admin/GameDetailManage";
import CategoryOptions from "./pages/admin/CategoryOptions";
import QuickLinks from "./pages/admin/QuickLinks";
import FAQsManage from "./pages/admin/FAQsManage";
import GuideSteps from "./pages/admin/GuideSteps";
import { GameProvider } from "./pages/uno/context/GameContext";
import UnoHome from "./pages/uno/index";
import UnoRoom from "./pages/uno/Room";
import UnoGame from "./pages/uno/Game";
import UnoResult from "./pages/uno/Result";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        {/* 前台页面路由 — 使用前台 Layout */}
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/categories"
          element={
            <Layout>
              <Categories />
            </Layout>
          }
        />
        <Route
          path="/game-detail/:id"
          element={
            <Layout>
              <GameDetail />
            </Layout>
          }
        />
        <Route
          path="/beginners"
          element={
            <Layout>
              <BeginnersGuide />
            </Layout>
          }
        />
        <Route
          path="/trending"
          element={
            <Layout>
              <Trending />
            </Layout>
          }
        />
        <Route
          path="/about"
          element={
            <Layout>
              <About />
            </Layout>
          }
        />

        {/* UNO 游戏路由 — 共享一个 GameProvider，避免页面切换时重建 Socket 连接 */}
        <Route element={<GameProvider><Outlet /></GameProvider>}>
          <Route path="/uno" element={<UnoHome />} />
          <Route path="/uno/room/:roomId" element={<UnoRoom />} />
          <Route path="/uno/game/:roomId" element={<UnoGame />} />
          <Route path="/uno/result/:roomId" element={<UnoResult />} />
        </Route>

        {/* 管理后台路由 — 使用 AdminLayout，独立于前台 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="games" element={<GamesManage />} />
          <Route path="games/:id/details" element={<GameDetailManage />} />
          <Route path="category-options" element={<CategoryOptions />} />
          <Route path="quick-links" element={<QuickLinks />} />
          <Route path="faqs" element={<FAQsManage />} />
          <Route path="guide-steps" element={<GuideSteps />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
