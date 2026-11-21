import { Navigate, Route, Routes } from 'react-router'
import LandingPage from './pages/LandingPage.tsx'

// 프로젝트 아카이브: 서버(BE)와 로그인이 내려가서 화면은 랜딩 하나뿐이다. 옛 주소(/login, /dashboard 등)는 랜딩으로 보낸다.
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
