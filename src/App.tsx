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
import { CatanGameProvider } from "./pages/catan/context/CatanGameContext";
import CatanHome from "./pages/catan/index";
import CatanRoom from "./pages/catan/Room";
import CatanGame from "./pages/catan/Game";
import CatanResult from "./pages/catan/Result";
import { HalliGameProvider } from "./pages/halli/context/HalliGameContext";
import HalliHome from "./pages/halli/index";
import HalliRoom from "./pages/halli/Room";
import HalliGame from "./pages/halli/Game";
import HalliResult from "./pages/halli/Result";
import { DrawGameProvider } from "./pages/draw/context/DrawGameContext";
import DrawHome from "./pages/draw/index";
import DrawRoom from "./pages/draw/Room";
import DrawGame from "./pages/draw/Game";
import DrawResult from "./pages/draw/Result";
import { SplendorGameProvider } from "./pages/splendor/context/SplendorGameContext";
import SplendorHome from "./pages/splendor/index";
import SplendorRoom from "./pages/splendor/Room";
import SplendorGame from "./pages/splendor/Game";
import SplendorResult from "./pages/splendor/Result";
import TarotHome from "./pages/tarot/index";
import TarotReading from "./pages/tarot/Reading";
import TarotHistory from "./pages/tarot/History";

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

        {/* 卡坦岛游戏路由 — 共享一个 CatanGameProvider，避免页面切换时重建 Socket 连接 */}
        <Route element={<CatanGameProvider />}>
          <Route path="/catan" element={<CatanHome />} />
          <Route path="/catan/room/:roomId" element={<CatanRoom />} />
          <Route path="/catan/game/:roomId" element={<CatanGame />} />
          <Route path="/catan/result/:roomId" element={<CatanResult />} />
        </Route>

        {/* 德国心脏病游戏路由 — 共享一个 HalliGameProvider，避免页面切换时重建 Socket 连接 */}
        <Route element={<HalliGameProvider />}>
          <Route path="/halli" element={<HalliHome />} />
          <Route path="/halli/room/:roomId" element={<HalliRoom />} />/
          <Route path="/halli/game/:roomId" element={<HalliGame />} />
          <Route path="/halli/result/:roomId" element={<HalliResult />} />
        </Route>

        {/* 你画我猜游戏路由 — 共享一个 DrawGameProvider，避免页面切换时重建 Socket 连接 */}
        <Route element={<DrawGameProvider />}>
          <Route path="/draw" element={<DrawHome />} />
          <Route path="/draw/room/:roomId" element={<DrawRoom />} />
          <Route path="/draw/game/:roomId" element={<DrawGame />} />
          <Route path="/draw/result/:roomId" element={<DrawResult />} />
        </Route>

        {/* 璀璨宝石游戏路由 — 共享一个 SplendorGameProvider，避免页面切换时重建 Socket 连接 */}
        <Route element={<SplendorGameProvider />}>
          <Route path="/splendor" element={<SplendorHome />} />
          <Route path="/splendor/room/:roomId" element={<SplendorRoom />} />
          <Route path="/splendor/game/:roomId" element={<SplendorGame />} />
          <Route path="/splendor/result/:roomId" element={<SplendorResult />} />
        </Route>

        {/* 塔罗占卜路由 — 纯前端，不需要后端 */}
        <Route path="/tarot" element={<Layout><TarotHome /></Layout>} />
        <Route path="/tarot/reading/:mode" element={<TarotReading />} />
        <Route path="/tarot/history" element={<TarotHistory />} />

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
