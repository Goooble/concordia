import "./App.css";
import "@xyflow/react/dist/style.css";

import { BrowserRouter, Routes, Route } from "react-router";

import Searchpage from "./Searchpage";
import Documentpage from "./Documentpage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Searchpage />} />
        <Route path="/docs/*" element={<Documentpage />} />
      </Routes>
    </BrowserRouter>
  );
}
