import { Navigate, Route, Routes } from 'react-router-dom';
import { CharacterSelectRoute } from './routes/CharacterSelectRoute';
import { GameRoute } from './routes/GameRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/select" replace />} />
      <Route path="/select" element={<CharacterSelectRoute />} />
      <Route path="/game/:characterId" element={<GameRoute />} />
      <Route path="*" element={<Navigate to="/select" replace />} />
    </Routes>
  );
}
