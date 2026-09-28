import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Result from "./pages/Result";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/analyze"
          element={<Analyze />}
        />

        <Route
          path="/history"
          element={<History />}
        />

        <Route
          path="/result/:id"
          element={<Result />}
        />
      </Routes>
    </>
  );
}

export default App;