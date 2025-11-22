import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, onSnapshot, collection } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import logoCizim from '../assets/logo.png'; 

// İkonlar
const UserIcon = () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const InstagramIcon = () => <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10c1.657 0 3 1.343 3 3v10c0 1.657-1.343 3-3 3H7c-1.657 0-3-1.343-3-3V7c0-1.657 1.343-3 3-3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16a4 4 0 100-8 4 4 0 000 8z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.5 6.5h.01" /></svg>;
const EyeIcon = () => <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;

export default function Register() {
  const [formData, setFormData] = useState({ name: '', surname: '', instagram: '' });
  const [loading, setLoading] = useState(false);
  const [activeRaffle, setActiveRaffle] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "status", "active_mainRaffle"), async (statusDoc) => {
      if (statusDoc.exists() && statusDoc.data().activeId) {
        const activeData = statusDoc.data();
        setActiveRaffle(activeData);
        
        const raffleUnsub = onSnapshot(doc(db, "mainRaffle", activeData.activeId), (raffleDoc) => {
            if (raffleDoc.exists()) {
                const users = raffleDoc.data().users || [];
                setParticipantCount(users.length);
            }
        });
        return () => raffleUnsub();
      } else {
        setActiveRaffle(null);
      }
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!activeRaffle?.activeId) {
      setError("Aktif çekiliş bulunamadı.");
      return;
    }

    try {
      const fullNameLower = formData.name.trim().toLowerCase();
      const surnameLower = formData.surname.trim().toLowerCase();

      const usersRef = query(collection(db, "users"), where("mainRaffleId", "==", activeRaffle.activeId));
      const querySnapshot = await getDocs(usersRef);
      
      let isDuplicate = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name.toLowerCase() === fullNameLower && data.surname.toLowerCase() === surnameLower) {
          isDuplicate = true;
        }
      });

      if (isDuplicate) throw new Error("Bu isimle zaten kayıt mevcut.");

      const newUserId = Date.now().toString(36) + Math.random().toString(36).slice(2);
      
      await setDoc(doc(db, "users", newUserId), {
        id: newUserId,
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        instagram: formData.instagram.trim() || null,
        mainRaffleId: activeRaffle.activeId,
        registeredAt: serverTimestamp()
      });

      await updateDoc(doc(db, "mainRaffle", activeRaffle.activeId), {
        users: arrayUnion(newUserId)
      });

      navigate('/view'); 

    } catch (err) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tarayıcının kendi scrollbarını zorla kapat */}
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          height: 100%;
          width: 100%;
        }
      `}</style>

      {/* ANA KAPSAYICI: fixed inset-0 ile ekranı kilitliyoruz */}
      <div className="fixed inset-0 w-full h-full bg-[#0B1726] flex flex-col items-center justify-center overflow-hidden font-sans">
        
        {/* --- ARKA PLAN EFEKTLERİ --- */}
        <div className="absolute inset-0 pointer-events-none z-0">
           <div className="absolute top-0 left-0 w-[60vw] h-[60vw] sm:w-[500px] sm:h-[500px] bg-red-600/20 rounded-full mix-blend-screen filter blur-[60px] sm:blur-[100px] opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
           <div className="absolute bottom-0 right-0 w-[60vw] h-[60vw] sm:w-[500px] sm:h-[500px] bg-green-600/20 rounded-full mix-blend-screen filter blur-[60px] sm:blur-[100px] opacity-30 translate-x-1/2 translate-y-1/2 animate-pulse delay-1000"></div>
        </div>

        {/* --- İÇERİK KARTI --- */}
        {/* max-h-full ve overflow-y-auto: Ekran çok çok küçükse sadece kartın içi kaysın, tüm sayfa kaymasın */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 overflow-y-auto">
          
          <div className="w-full max-w-md backdrop-blur-xl bg-[#1a2942]/60 border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/10 p-3 rounded-full mb-2 shadow-lg backdrop-blur-sm border border-white/10">
                <img src={logoCizim} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
              </div>

              <h2 className="text-[10px] font-bold tracking-[0.2em] text-blue-200 uppercase opacity-80">
                İnovasyon ve Liderlik Topluluğu
              </h2>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Çekiliş Platformu
              </h1>
              
              {activeRaffle ? (
                <div className="mt-2 inline-flex items-center bg-black/30 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <p className="text-white text-xs font-medium">
                    <span className="text-green-400 font-bold">{participantCount} Katılımcı</span>
                  </p>
                </div>
              ) : (
                <div className="mt-2 inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-200 text-[10px] font-medium">
                  Çekiliş bekleniyor
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon />
                </div>
                <input 
                  required
                  type="text" 
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1726]/60 border border-slate-600/50 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Adınız"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon />
                </div>
                <input 
                  required
                  type="text" 
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1726]/60 border border-slate-600/50 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Soyadınız"
                  value={formData.surname}
                  onChange={(e) => setFormData({...formData, surname: e.target.value})}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <InstagramIcon />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B1726]/60 border border-slate-600/50 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                  placeholder="Instagram (Opsiyonel)"
                  value={formData.instagram}
                  onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                />
              </div>

              {error && (
                <div className="p-2 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-lg text-center">
                  {error}
                </div>
              )}

              <div className="pt-1 flex flex-col gap-2">
                  <button 
                    disabled={loading || !activeRaffle}
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 text-sm"
                  >
                    {loading ? '...' : 'ÇEKİLİŞE KATIL'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => navigate('/view')}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <EyeIcon />
                    İzlemeye Geç
                  </button>
              </div>
            </form>
          </div>
          
          <footer className="mt-4 text-slate-500 text-[9px] uppercase tracking-widest opacity-40">
            DPÜ İnovasyon ve Liderlik Topluluğu
          </footer>
        </div>
      </div>
    </>
  );
}