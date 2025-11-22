import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import logoCizim from '../assets/logo.png'; 

export default function View() {
  const [activeRaffle, setActiveRaffle] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [liveState, setLiveState] = useState({ status: 'idle', countdown: 0, currentPrize: '', drawType: '' });
  const [lastWinner, setLastWinner] = useState(null);

  // 1. Aktif Çekiliş ve Katılımcı Sayısını Dinle
  useEffect(() => {
    const unsubActive = onSnapshot(doc(db, "status", "active_mainRaffle"), (statusDoc) => {
      if (statusDoc.exists() && statusDoc.data().activeId) {
        const raffleId = statusDoc.data().activeId;
        
        // Çekiliş Detaylarını Dinle
        const unsubRaffle = onSnapshot(doc(db, "mainRaffle", raffleId), (raffleDoc) => {
          if (raffleDoc.exists()) {
            const data = raffleDoc.data();
            setActiveRaffle(data);
            setParticipantCount(data.users ? data.users.length : 0);
            
            // Son kazanan değiştiyse güncelle
            if (data.lastWinner) {
                setLastWinner(data.lastWinner);
            }
          }
        });
        return () => unsubRaffle();
      } else {
          setActiveRaffle(null);
      }
    });

    // 2. Canlı Çekiliş Durumunu Dinle
    const unsubLive = onSnapshot(doc(db, "status", "live_draw"), (docSnap) => {
      if (docSnap.exists()) {
        setLiveState(docSnap.data());
      }
    });

    return () => { unsubActive(); unsubLive(); };
  }, []);

  // Geri Sayım Mantığı
  useEffect(() => {
    let interval;
    if (liveState.status === 'drawing' && liveState.countdown > 0) {
      interval = setInterval(() => {
        setLiveState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [liveState.status, liveState.countdown]);

  // Konfeti (Sadece Asil Kazananlar İçin)
  useEffect(() => {
    if (liveState.status === 'idle' && lastWinner && lastWinner.type === 'asil') {
        fireConfetti();
    }
  }, [liveState.status, lastWinner]);

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FFA500'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#0000FF', '#FFFFFF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  // Renk Temaları
  const isAsil = liveState.drawType === 'asil';
  // Eğer kazanan belli olduysa (lastWinner) onun tipine göre renk belirle, yoksa anlık çekilen tipe göre
  const displayAsil = lastWinner ? lastWinner.type === 'asil' : isAsil;
  
  const themeColor = displayAsil ? 'text-yellow-400' : 'text-blue-300';
  const borderColor = displayAsil ? 'border-yellow-500' : 'border-blue-500';
  const badgeBg = displayAsil ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white';
  const shadowColor = displayAsil ? 'shadow-yellow-500/20' : 'shadow-blue-500/20';

  // Bekleme Ekranı (Aktif Etkinlik Yoksa)
  if (!activeRaffle) return (
    <div className="h-[100dvh] bg-[#0B1726] flex flex-col items-center justify-center text-slate-500 p-4 text-center">
        <img src={logoCizim} className="w-24 h-24 md:w-32 md:h-32 opacity-20 mb-4 animate-pulse object-contain"/>
        <h1 className="text-xl md:text-2xl tracking-widest uppercase font-bold">Aktif Etkinlik Bekleniyor...</h1>
    </div>
  );

  return (
    <div className="relative h-[100dvh] w-full bg-[#0B1726] text-white overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-none">
      
      {/* --- ARKA PLAN EFEKTLERİ --- */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[300px] h-[300px] md:w-[800px] md:h-[800px] bg-blue-900/20 rounded-full blur-[80px] md:blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] md:w-[800px] md:h-[800px] bg-purple-900/20 rounded-full blur-[80px] md:blur-[120px] translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* --- ÜST BİLGİ BAR --- */}
      <div className="absolute top-4 md:top-8 w-full flex justify-between items-start px-4 md:px-12 z-20">
          <img src={logoCizim} className="w-12 h-12 md:w-20 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"/>
          
          <div className="text-right flex flex-col items-end">
              <h2 className="text-sm md:text-3xl font-bold tracking-tight text-slate-200 max-w-[200px] md:max-w-none truncate">{activeRaffle.title}</h2>
              <div className="inline-flex items-center gap-2 md:gap-3 bg-white/5 px-3 py-1 md:px-6 md:py-2 rounded-full mt-2 border border-white/10 backdrop-blur-md">
                  <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm md:text-xl font-mono font-bold text-blue-200">{participantCount}</span>
                  <span className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest hidden sm:inline">Katılımcı</span>
              </div>
          </div>
      </div>


      {/* --- MERKEZ SAHNE --- */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-6xl text-center px-4">
        
        {/* DURUM 1: ÇEKİLİŞ YAPILIYOR (GERİ SAYIM) */}
        {liveState.status === 'drawing' && (
            <div className="animate-in zoom-in duration-300 flex flex-col items-center w-full">
                
                {/* Ne Çekiliyor? */}
                <div className="mb-4 md:mb-12 space-y-4 md:space-y-6 w-full">
                    <span className={`px-4 py-1 md:px-6 md:py-2 rounded-lg font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase text-xs md:text-sm shadow-2xl ${isAsil ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>
                        {isAsil ? '🏆 ASİL TALİHLİ ARANIYOR' : '🥈 YEDEK TALİHLİ ARANIYOR'}
                    </span>
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white drop-shadow-2xl mt-4 px-2 break-words leading-tight">
                        {liveState.currentPrize}
                    </h1>
                </div>

                {/* Geri Sayım Rakamı */}
                <div className="relative mt-4 md:mt-8">
                    <div className={`text-9xl sm:text-[10rem] md:text-[15rem] lg:text-[18rem] leading-none font-black tabular-nums tracking-tighter ${isAsil ? 'text-yellow-400' : 'text-blue-300'} drop-shadow-[0_0_50px_rgba(255,255,255,0.2)] animate-pulse transition-all duration-300`}>
                        {liveState.countdown}
                    </div>
                    {/* Daire Efekti */}
                    <div className={`absolute inset-0 border-[6px] md:border-[10px] ${isAsil ? 'border-yellow-500' : 'border-blue-500'} rounded-full opacity-20 animate-ping`}></div>
                </div>
            </div>
        )}

        {/* DURUM 2: SONUÇ (KAZANAN VAR) */}
        {liveState.status === 'idle' && lastWinner && (
            <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 flex flex-col items-center w-full">
                
                {/* Kazanan Başlığı */}
                <div className="mb-6 md:mb-10 w-full px-4">
                    <div className={`inline-block px-6 py-2 md:px-8 md:py-3 rounded-xl text-sm md:text-xl font-black tracking-widest uppercase mb-4 shadow-2xl ${badgeBg}`}>
                        {lastWinner.type === 'asil' ? '🎉 KAZANAN' : 'YEDEK TALİHLİ'}
                    </div>
                    <h2 className="text-xl md:text-4xl text-slate-300 font-light break-words px-4">{lastWinner.prize}</h2>
                </div>

                {/* Kazanan İsim Kartı */}
                <div className={`w-full max-w-[95vw] md:max-w-4xl bg-[#1a2942]/80 backdrop-blur-xl p-8 md:p-16 rounded-[2rem] md:rounded-[3rem] border-2 ${borderColor} ${shadowColor} shadow-2xl transition-all`}>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white mb-2 break-words leading-tight capitalize">
                        {lastWinner.name}
                    </h1>
                </div>
                
                <div className="mt-8 md:mt-12 text-slate-500 text-xs md:text-sm animate-pulse tracking-wide">
                    Yeni çekiliş için admin bekleniyor...
                </div>
            </div>
        )}

        {/* DURUM 3: BAŞLANGIÇ (BOŞTA) */}
        {liveState.status === 'idle' && !lastWinner && (
             <div className="flex flex-col items-center opacity-50 px-4">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin mb-6 md:mb-8"></div>
                <h1 className="text-2xl md:text-4xl font-light tracking-wider text-slate-400 text-center">
                    Çekiliş Başlamak Üzere
                </h1>
                <p className="mt-2 text-sm text-slate-600">Lütfen bekleyiniz</p>
             </div>
        )}

      </div>

      {/* --- ALT BİLGİ --- */}
      <div className="absolute bottom-4 md:bottom-6 text-center opacity-30 text-[10px] md:text-sm tracking-[0.3em] md:tracking-[0.5em] uppercase w-full px-4">
        Kütahya Dumlupınar Üniversitesi
      </div>

    </div>
  );
}