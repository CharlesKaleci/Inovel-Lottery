import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom'; // <--- YENİ EKLENDİ
import logoCizim from '../assets/logo.png'; 

// --- İKONLAR ---
const LogoutIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const BackIcon = () => <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const SearchIcon = () => <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const DownloadIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  
  // URL Yönetimi (Geri tuşu için kritik kısım)
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data
  const [mainRaffles, setMainRaffles] = useState([]);
  const [activeRaffleId, setActiveRaffleId] = useState(null);
  
  // Detail View
  const [selectedRaffle, setSelectedRaffle] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Forms
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newPrizeTitle, setNewPrizeTitle] = useState('');

  // --- INIT ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Ana Çekilişleri Dinle
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "mainRaffle"), orderBy("createdAt", "desc"));
    const unsubRaffles = onSnapshot(q, (snapshot) => {
        const rafflesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMainRaffles(rafflesData);
    });
    const unsubActive = onSnapshot(doc(db, "status", "active_mainRaffle"), (doc) => setActiveRaffleId(doc.exists() ? doc.data().activeId : null));
    return () => { unsubRaffles(); unsubActive(); };
  }, [user]);

  // URL DEĞİŞİKLİĞİNİ DİNLE (Geri tuşu mantığı burada)
  useEffect(() => {
    const raffleIdFromUrl = searchParams.get('id');
    
    if (raffleIdFromUrl && mainRaffles.length > 0) {
        // URL'de ID varsa, o çekilişi bul ve seçili yap
        const found = mainRaffles.find(r => r.id === raffleIdFromUrl);
        if (found) {
            setSelectedRaffle(found);
        }
    } else {
        // URL'de ID yoksa (Geri tuşuna basıp ana listeye dönüldüyse) seçimi kaldır
        setSelectedRaffle(null);
    }
  }, [searchParams, mainRaffles]);


  // Seçili Çekiliş Varsa Detaylarını (Ödül/Katılımcı) Dinle
  useEffect(() => {
    if (!selectedRaffle) return;
    
    // Ödülleri Çek
    const qPrizes = query(collection(db, "prizes"), where("mainRaffleId", "==", selectedRaffle.id));
    const unsubPrizes = onSnapshot(qPrizes, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setPrizes(list);
    });
    // Katılımcıları Çek
    const qUsers = query(collection(db, "users"), where("mainRaffleId", "==", selectedRaffle.id));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => { unsubPrizes(); unsubUsers(); };
  }, [selectedRaffle]);

  // --- LOGIC ---
  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { alert(error.message); } };
  
  const createMainRaffle = async (e) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    await addDoc(collection(db, "mainRaffle"), { title: newEventTitle, createdAt: serverTimestamp(), users: [] });
    setNewEventTitle('');
  };

  const toggleActiveStatus = async (raffle) => {
    const statusRef = doc(db, "status", "active_mainRaffle");
    if (activeRaffleId === raffle.id) await setDoc(statusRef, { activeId: null, title: null });
    else await setDoc(statusRef, { activeId: raffle.id, title: raffle.title });
  };

  // Çekiliş Seçme (URL'yi Günceller)
  const openRaffleDetail = (raffle) => {
      setSearchParams({ id: raffle.id }); // URL ?id=... olur, useEffect bunu yakalar
  };

  // Listeye Dönme (URL'yi Temizler)
  const backToList = () => {
      setSearchParams({}); // URL temizlenir, useEffect yakalar ve listeye döner
  };

  const addPrize = async (e) => {
    e.preventDefault();
    if (!newPrizeTitle.trim()) return;
    await addDoc(collection(db, "prizes"), { mainRaffleId: selectedRaffle.id, title: newPrizeTitle, winners: [], reserves: [], createdAt: serverTimestamp() });
    setNewPrizeTitle('');
  };

  const drawWinner = async (prizeId, type) => {
    if(participants.length === 0) return alert("Katılımcı yok!");
    let allWinners = [];
    prizes.forEach(p => { if(p.winners) allWinners = [...allWinners, ...p.winners]; });
    const eligible = participants.filter(u => !allWinners.includes(u.id));
    if (eligible.length === 0) return alert("Herkes ödül aldı!");

    // Ödül ismini bul
    const currentPrize = prizes.find(p => p.id === prizeId);
    const prizeTitle = currentPrize ? currentPrize.title : "Sürpriz Ödül";

    await setDoc(doc(db, "status", "live_draw"), { 
        status: 'drawing', 
        countdown: 5, 
        currentPrize: prizeTitle,
        drawType: type
    });

    setTimeout(async () => {
        const lucky = eligible[Math.floor(Math.random() * eligible.length)];
        const prizeRef = doc(db, "prizes", prizeId);
        
        if (type === 'asil') {
            await updateDoc(prizeRef, { winners: arrayUnion(lucky.id) });
        } else {
            await updateDoc(prizeRef, { reserves: arrayUnion(lucky.id) });
        }
        
        await updateDoc(doc(db, "mainRaffle", selectedRaffle.id), { 
            lastWinner: { 
                name: lucky.name + ' ' + lucky.surname, 
                prize: prizeTitle,
                type: type 
            } 
        });

        await setDoc(doc(db, "status", "live_draw"), { status: 'idle' });
    }, 5000);
  };

  const deleteEvent = async (id) => { if(confirm("Silmek istediğine emin misin?")) await deleteDoc(doc(db, "mainRaffle", id)); };

  // EXPORT CSV
  const exportToCSV = () => {
    if (participants.length === 0) return alert("İndirilecek veri yok.");
    const headers = "Ad,Soyad,Instagram,Durum,Kazanılan Ödül,ID\n";
    const rows = participants.map(p => {
        let status = "Katılımcı";
        let prizeName = "-";
        for (const prize of prizes) {
            if (prize.winners?.includes(p.id)) { status = "ASİL KAZANAN 🏆"; prizeName = prize.title; break; }
            if (prize.reserves?.includes(p.id)) { status = "YEDEK"; prizeName = prize.title; break; }
        }
        const safeName = (p.name || "").replace(/,/g, " ");
        const safeSurname = (p.surname || "").replace(/,/g, " ");
        const safeInsta = (p.instagram || "-").replace(/,/g, " ");
        const safePrize = prizeName.replace(/,/g, " - ");
        return `${safeName},${safeSurname},${safeInsta},${status},${safePrize},${p.id}`;
    }).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + "\uFEFF" + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    link.setAttribute("download", `${selectedRaffle.title}_Raporu_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ARAMA FİLTRESİ
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
        (p.name + ' ' + p.surname).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.instagram || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [participants, searchTerm]);


  // --- UI COMPONENTS ---
  const Background = () => (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#0B1726]">
       <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-red-600/10 rounded-full mix-blend-screen filter blur-[120px] opacity-30 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
       <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[120px] opacity-30 translate-x-1/2 translate-y-1/2 animate-pulse delay-1000"></div>
    </div>
  );

  if (loading) return <div className="h-screen bg-[#0B1726] flex items-center justify-center text-blue-200 font-bold animate-pulse">Yükleniyor...</div>;

  // 1. LOGIN
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden font-sans p-4">
        <Background />
        <div className="relative z-10 bg-[#1a2942]/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/10">
            <div className="flex flex-col items-center mb-8">
                <div className="bg-white/10 p-4 rounded-full mb-4 shadow-lg border border-white/5">
                    <img src={logoCizim} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Admin Paneli</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" className="w-full px-4 py-3 rounded-xl bg-[#0B1726]/80 border border-slate-600/50 text-white outline-none focus:border-blue-500 transition-all" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" className="w-full px-4 py-3 rounded-xl bg-[#0B1726]/80 border border-slate-600/50 text-white outline-none focus:border-blue-500 transition-all" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} />
                <button className="w-full py-4 mt-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40">Giriş Yap</button>
            </form>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD
  return (
    <div className="fixed inset-0 bg-[#0B1726] text-slate-200 font-sans flex flex-col overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
      <Background />

      {/* NAVBAR */}
      <header className="relative z-20 bg-[#1a2942]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
            <img src={logoCizim} className="w-8 h-8 object-contain"/>
            <div className="hidden sm:block">
                <h1 className="font-bold text-white leading-none text-sm sm:text-base">YÖNETİM</h1>
                <span className="text-[10px] text-blue-300 tracking-widest uppercase">Kontrol Paneli</span>
            </div>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm font-medium border border-red-500/20 transition-all">
            <LogoutIcon /> <span className="hidden sm:inline">Çıkış</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
            
            {/* --- GÖRÜNÜM 1: LİSTE --- */}
            {!selectedRaffle && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-r from-[#1a2942]/80 to-blue-900/20 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Merhaba, Kaptan 👋</h2>
                        <form onSubmit={createMainRaffle} className="flex flex-col sm:flex-row gap-3 max-w-2xl mt-4">
                            <input 
                                type="text" 
                                placeholder="Yeni Etkinlik Adı..." 
                                className="flex-1 bg-[#0B1726]/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all placeholder-slate-500"
                                value={newEventTitle}
                                onChange={e => setNewEventTitle(e.target.value)}
                            />
                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                                <PlusIcon /> <span className="whitespace-nowrap">Oluştur</span>
                            </button>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {mainRaffles.map(raffle => (
                            <div key={raffle.id} className={`relative bg-[#1a2942]/40 backdrop-blur-sm rounded-2xl border p-5 transition-all hover:bg-[#1a2942]/60 ${activeRaffleId === raffle.id ? 'border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-white/5 hover:border-blue-500/30'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/5 p-2 rounded-xl"><UsersIcon /></div>
                                    {activeRaffleId === raffle.id ? (
                                        <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/30 animate-pulse">CANLI</span>
                                    ) : (
                                        <span className="bg-slate-700/30 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-full border border-white/5">PASİF</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-white mb-6 truncate">{raffle.title}</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <button onClick={() => openRaffleDetail(raffle)} className="col-span-2 py-2 rounded-lg bg-blue-600/10 text-blue-300 border border-blue-500/20 hover:bg-blue-600/20 font-medium transition-all">Yönet</button>
                                    <button onClick={() => toggleActiveStatus(raffle)} className={`py-2 rounded-lg border font-medium transition-all ${activeRaffleId === raffle.id ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{activeRaffleId === raffle.id ? 'Durdur' : 'Başlat'}</button>
                                    <button onClick={() => deleteEvent(raffle.id)} className="py-2 rounded-lg border border-slate-600/30 text-slate-400 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- GÖRÜNÜM 2: DETAY --- */}
            {selectedRaffle && (
                <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <button onClick={backToList} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors group">
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-600 mr-3 border border-white/5"><BackIcon /></div>
                        <span className="font-medium text-sm">Geri Dön</span>
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* SOL: ÖDÜLLER */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#1a2942]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedRaffle.title}</h2>
                                    <p className="text-blue-300/80 text-sm">Toplam {prizes.length} Ödül</p>
                                </div>
                                <div className="flex items-center gap-3 bg-[#0B1726]/60 px-4 py-2 rounded-xl border border-white/5 self-start">
                                    <UsersIcon />
                                    <span className="text-xl font-bold text-white">{participants.length}</span>
                                </div>
                            </div>

                            <form onSubmit={addPrize} className="flex gap-3">
                                <input type="text" placeholder="🎁 Yeni Ödül Ekle..." className="flex-1 bg-[#1a2942]/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500/50 transition-all placeholder-slate-500" value={newPrizeTitle} onChange={e => setNewPrizeTitle(e.target.value)} />
                                <button className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-bold shadow-lg transition-all">Ekle</button>
                            </form>

                            <div className="space-y-4 pb-10">
                                {prizes.length === 0 && <div className="text-center py-8 border-2 border-dashed border-slate-700/50 rounded-2xl text-slate-500">Ödül yok.</div>}
                                {prizes.map((prize, index) => (
                                    <div key={prize.id} className="bg-[#1a2942]/40 border border-white/5 rounded-2xl p-5 hover:bg-[#1a2942]/60 transition-all">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-300 font-bold text-sm">{index + 1}</div>
                                                <h3 className="font-bold text-white">{prize.title}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => drawWinner(prize.id, 'asil')} disabled={prize.winners?.length > 0} className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${prize.winners?.length > 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg'}`}>{prize.winners?.length > 0 ? 'Bitti' : '🎲 Asil'}</button>
                                                <button onClick={() => drawWinner(prize.id, 'yedek')} className="px-4 py-2 rounded-lg font-medium text-xs sm:text-sm bg-[#0B1726] hover:bg-slate-800 text-slate-300 border border-white/10">Yedek</button>
                                            </div>
                                        </div>
                                        {(prize.winners?.length > 0 || prize.reserves?.length > 0) && (
                                            <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2 text-sm">
                                                {prize.winners?.map(uid => {
                                                    const u = participants.find(p => p.id === uid);
                                                    return u ? <div key={uid} className="flex items-center gap-2 text-green-400 bg-green-500/5 p-2 rounded border border-green-500/10"><span className="font-bold">🏆 {u.name} {u.surname}</span></div> : null;
                                                })}
                                                {prize.reserves?.map((uid, i) => {
                                                    const u = participants.find(p => p.id === uid);
                                                    return u ? <div key={uid} className="flex items-center gap-2 text-orange-300/70 px-2"><span className="text-[10px] border border-orange-500/20 px-1 rounded">YEDEK {i+1}</span><span>{u.name} {u.surname}</span></div> : null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SAĞ: KATILIMCILAR (Mobile: Stacked, Desktop: Sticky) */}
                        <div className="bg-[#1a2942]/40 backdrop-blur-md border border-white/5 rounded-3xl p-5 h-fit max-h-[600px] lg:sticky lg:top-6 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2"><UsersIcon /> Liste</h3>
                                <button onClick={exportToCSV} title="Excel İndir" className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"><DownloadIcon /></button>
                            </div>
                            
                            {/* Arama Kutusu */}
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                                <input 
                                    type="text" 
                                    placeholder="İsim Ara..." 
                                    className="w-full bg-[#0B1726]/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 min-h-[200px]">
                                {filteredParticipants.length === 0 && <p className="text-slate-500 text-xs text-center mt-4">Bulunamadı.</p>}
                                {filteredParticipants.map((p, i) => (
                                    <div key={p.id} className="flex items-center justify-between p-2 bg-[#0B1726]/40 rounded-lg border border-white/5 hover:border-blue-500/30 transition-all group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="text-slate-600 text-xs font-mono w-5">{i+1}</span>
                                            <div className="truncate">
                                                <div className="text-slate-300 text-sm font-medium truncate">{p.name} {p.surname}</div>
                                                {p.instagram && <div className="text-blue-400/50 text-[10px] truncate">{p.instagram}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}