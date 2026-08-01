import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:code" element={<RoomPage />} />
    </Routes>
  );
}
