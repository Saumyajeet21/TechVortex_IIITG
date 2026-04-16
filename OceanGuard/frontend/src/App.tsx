import { Routes, Route } from 'react-router-dom'
import DashboardPage from '@/pages/DashboardPage'
import ZoneDetailPage from '@/pages/ZoneDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
    </Routes>
  )
}
