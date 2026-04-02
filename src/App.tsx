import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import GameDetail from "./pages/GameDetail";
import BeginnersGuide from "./pages/BeginnersGuide";
import Trending from "./pages/Trending";
import About from "./pages/About";

const queryClient = new QueryClient();

// Configure static routes, avoiding any dynamic :id patterns
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/game-detail/:id" element={<GameDetail />} />
          <Route path="/beginners" element={<BeginnersGuide />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;