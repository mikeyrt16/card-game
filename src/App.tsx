import { Navigate, Route, Routes } from 'react-router-dom';
import { CharacterSelectRoute } from './routes/CharacterSelectRoute';
import { GameRoute } from './routes/GameRoute';
import { GameConnectionProvider } from './net/GameConnectionProvider';

export function App() {
  return (
    <GameConnectionProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/select" replace />} />
        <Route path="/select" element={<CharacterSelectRoute />} />
        <Route path="/game" element={<GameRoute />} />
        <Route path="*" element={<Navigate to="/select" replace />} />
      </Routes>
    </GameConnectionProvider>
  );
}
