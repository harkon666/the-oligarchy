import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import LandingPage from './pages/LandingPage';
import PhaserGame from './pages/PhaserGamePage';
import { ConnectWallet } from './components/ConnectWallet';

function ProtectedRoute({ children }) {
  const { isConnected } = useAccount();
  console.log(isConnected);
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