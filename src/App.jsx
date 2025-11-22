import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Admin from './pages/Admin';
import View from './pages/View';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ana Sayfa (/) -> Kayıt Ekranına gitmeli */}
        <Route path="/" element={<Register />} />
        
        {/* Admin Paneli (/admin) -> Admin dosyasına gitmeli */}
        <Route path="/admin" element={<Admin />} />
        
        {/* Gösteri Ekranı (/view) -> View dosyasına gitmeli */}
        <Route path="/view" element={<View />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;