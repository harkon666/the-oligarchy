import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import LandingPage from './pages/LandingPage';
import PhaserGame from './pages/PhaserGamePage';
import FarmPage from './pages/FarmPage';
import PoliticsPage from './pages/PoliticsPage';
import BribePage from './pages/BribePage';
import WarPage from './pages/WarPage';
import StorePage from './pages/StorePage';
import DevSimulatorPage from './pages/DevSimulatorPage';
import { ConnectWallet } from './components/ConnectWallet';

function ProtectedRoute({ children }) {
  const { isConnected } = useAccount();
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/connect" element={<ConnectWallet />} />
        <Route
          path="/farm"
          element={
            <ProtectedRoute>
              <FarmPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/politics"
          element={
            <ProtectedRoute>
              <PoliticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bribe"
          element={
            <ProtectedRoute>
              <BribePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/war"
          element={
            <ProtectedRoute>
              <WarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/store"
          element={
            <ProtectedRoute>
              <StorePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev"
          element={
            <ProtectedRoute>
              <DevSimulatorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <PhaserGame />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;