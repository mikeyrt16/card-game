import { Navigate, Route, Routes } from 'react-router-dom';
import { GameRoute } from './routes/GameRoute';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/game" replace />} />
      <Route path="/game" element={<GameRoute />} />
    </Routes>
  );
}
