// app.js – Sefer Sırası (satılık sürüm): girişler, şoför ekranı, kahya ekranı, sahip paneli
'use strict';
let AUTH=null,FS=null,USER=null,ROL=null,DURAK=null,A=null,G={},TARIH=null,HAT=null,GORUNUM={gt:null,mv:null};
let OTOD=false,DINLE=[],GUNDIN=null,CIHAZ={d:'bilinmiyor'},CLIST={},KAYIT_T=null,ACIK={takip:1,seferler:1};
let TAKIP={p:null,t:null,plan:null,kil:null,kilDin:null,kilHb:null,gps:null,konum:null,cg:0,pay:false,uyar:{},olay:null},CTX=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get:(k,d='')=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const bugun=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const simdiSn=()=>{const n=new Date();return n.getHours()*3600+n.getMinutes()*60+n.getSeconds()};
const dref=p=>FS.doc(p),cref=p=>FS.collection(p);
const dp=(...x)=>'duraklar/'+DURAK+(x.length?'/'+x.join('/'):'');
function cModel(){const u=navigator.userAgent;return /iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':'Bilgisayar'}
function kahyaMi(){return ROL=='kahya'||ROL=='sahip'}
function izinli(){return kahyaMi()||CIHAZ.d=='onay'}
function telKod(){let k=LS.get('ckod');if(!k){k=String(1000+Math.floor(Math.random()*9000));LS.set('ckod',k)}return k}
function bip(f,d){try{CTX=CTX||new (window.AudioContext||window.webkitAudioContext)();const o=CTX.createOscillator(),g=CTX.createGain();o.frequency.value=f;o.connect(g);g.connect(CTX.destination);o.start();o.stop(CTX.currentTime+d)}catch(e){}}
function dinleKapat(){DINLE.forEach(f=>{try{f()}catch(e){}});DINLE=[];if(GUNDIN){GUNDIN();GUNDIN=null}}
const alt='<div class="alt"><span>Seyithan Niksarlı tarafından geliştirildi</span></div>';

// ================= başlangıç =================
function basla(){
 const F=window.FIREBASE_AYAR||{};
 if(!window.firebase||!F.apiKey||/^BURAYA/.test(F.apiKey)){tam('<h2>Kurulum gerekli</h2><p>config.js dosyasına Firebase bilgilerini yaz. Ayrıntılar KURULUM.md dosyasında.</p>');return}
 try{firebase.initializeApp(F)}catch(e){}
 AUTH=firebase.auth();FS=firebase.firestore();
 tam('<h2>Yükleniyor…</h2>');
 AUTH.onAuthStateChanged(async u=>{
  USER=u;dinleKapat();takipDurdur();A=null;DURAK=null;ROL=null;CIHAZ={d:'bilinmiyor'};
  if(!u){girisEkrani();return}
  try{
   if(u.email&&u.email.toLowerCase()==String(window.SAHIP_EPOSTA).toLowerCase()){ROL='sahip';DURAK=LS.get('sDurak')||null;if(!DURAK){sahipPanel();return}}
   else if(u.isAnonymous){ROL='sofor';DURAK=LS.get('durak')||null;if(!DURAK){soforDurakSor();return}}
   else{const k=await dref('kullanicilar/'+u.uid).get();const x=k.data();if(!x||!x.durak){tam('<h2>Hesap tanımlı değil</h2><p>Bu hesaba durak atanmamış. Uygulama sahibiyle görüş.</p><button class="ana" onclick="cikis()">Çıkış</button>');return}ROL='kahya';DURAK=x.durak}
   durakAc();
  }catch(e){tam('<h2>Bağlanamadı</h2><p>'+esc(e.message||e.code||e)+'</p><button class="ana" onclick="location.reload()">Tekrar dene</button><button class="bag" onclick="cikis()">Çıkış</button>')}
 });
}
function tam(ic){$('kok').innerHTML='<div class="tam"><div class="kutu"><img src="sofor-ikon.svg" width="76" height="76" style="display:block;margin:0 auto 16px" onerror="this.remove()">'+ic+'<div style="margin-top:26px;font-size:12px;opacity:.6">Seyithan Niksarlı tarafından geliştirildi</div></div></div>'}
function hata(e){const k=e&&e.code||'';return k.includes('wrong-password')||k.includes('invalid-credential')||k.includes('user-not-found')?'Kullanıcı adı ya da şifre yanlış.':k.includes('too-many')?'Çok fazla deneme yaptın, biraz bekle.':k.includes('network')?'İnternet bağlantını kontrol et.':(e.message||k||String(e))}

// ================= giriş ekranları =================
function girisEkrani(){
 tam('<h2>'+esc(window.UYGULAMA_ADI||'Sefer Sırası')+'</h2><p style="opacity:.9">Giriş türünü seç</p>'+
  '<button class="ana" onclick="soforGir()">🚐 Şoför girişi</button>'+
  '<button class="ana ikinci" onclick="kahyaEkrani()">🔑 Kahya girişi</button>'+
  '<button class="bag" onclick="sahipEkrani()">Uygulama sahibi</button>');
}
function soforGir(){if(!LS.get('durak')){soforDurakSor(true);return}tam('<h2>Bağlanıyor…</h2>');AUTH.signInAnonymously().catch(e=>{alert(hata(e));girisEkrani()})}
function soforDurakSor(girisYok){
 tam('<h2>Durak kodun</h2><p style="opacity:.9">Kahyanın verdiği durak kodunu yaz. Bir kere yazman yeter.</p><input id="dkod" placeholder="Örn. BL-105" autocapitalize="characters"><button class="ana" onclick="soforDurakKaydet('+(girisYok?1:0)+')">Devam</button><button class="bag" onclick="'+(girisYok?'girisEkrani()':'cikis()')+'">Geri</button>');
}
async function soforDurakKaydet(girisYok){
 const k=($('dkod').value||'').trim().toUpperCase();if(!k){alert('Durak kodunu yaz.');return}
 try{if(girisYok||!AUTH.currentUser)await AUTH.signInAnonymously();const d=await dref('duraklar/'+k).get();if(!d.exists){alert(k+' diye bir durak bulunamadı. Kodu kahyana sor.');return}
  LS.set('durak',k);DURAK=k;ROL='sofor';durakAc()}catch(e){alert(hata(e))}
}
function kahyaEkrani(){
 tam('<h2>Kahya girişi</h2><input id="kdurak" placeholder="Durak kodu" autocapitalize="characters" value="'+esc(LS.get('kDurak'))+'"><input id="kadi" placeholder="Kullanıcı adı" autocapitalize="none" value="'+esc(LS.get('kAdi'))+'"><input id="ksifre" type="password" placeholder="Şifre"><button class="ana" onclick="kahyaGir()">Giriş yap</button><button class="bag" onclick="girisEkrani()">Geri</button>');
}
const kahyaEposta=(d,k)=>(kisaId(k)+'.'+kisaId(d)+'@kahya.sefersirasi.app');
function kahyaGir(){const d=$('kdurak').value.trim().toUpperCase(),k=$('kadi').value.trim(),s=$('ksifre').value;if(!d||!k||!s){alert('Üç kutuyu da doldur.');return}
 LS.set('kDurak',d);LS.set('kAdi',k);tam('<h2>Giriş yapılıyor…</h2>');AUTH.signInWithEmailAndPassword(kahyaEposta(d,k),s).catch(e=>{alert(hata(e));kahyaEkrani()})}
function sahipEkrani(){tam('<h2>Uygulama sahibi</h2><input id="seposta" type="email" placeholder="E-posta" autocapitalize="none"><input id="ssifre" type="password" placeholder="Şifre"><button class="ana" onclick="sahipGir()">Giriş yap</button><button class="bag" onclick="girisEkrani()">Geri</button>')}
function sahipGir(){const e=$('seposta').value.trim(),p=$('ssifre').value;if(!e||!p){alert('E-posta ve şifreyi yaz.');return}tam('<h2>Giriş yapılıyor…</h2>');AUTH.signInWithEmailAndPassword(e,p).catch(e=>{alert(hata(e));sahipEkrani()})}
function cikis(){if(ROL=='sofor'&&!confirm('Çıkış yaparsan bu telefon yeniden onay ister. Emin misin?'))return;if(ROL=='sofor')LS.set('durak','');if(ROL=='sahip')LS.set('sDurak','');takipDurdur();AUTH.signOut()}

// ================= sahip paneli =================
let DLIST={};
function sahipPanel(){
 dinleKapat();
 $('kok').innerHTML=ust('Yönetim','Bütün duraklar','<button onclick="cikis()">Çıkış</button>')+'<div class="ic"><details class="bolum" open><summary>Duraklar</summary><div id="dliste" class="kucuk">Yükleniyor…</div></details>'+
  '<details class="bolum" open><summary>Yeni durak</summary><label>Durak kodu (şoförler bununla girer)</label><input id="ydkod" placeholder="Örn. TEPECIK" autocapitalize="characters" style="width:100%"><label>Durak adı</label><input id="ydad" placeholder="Örn. Tepecik Minibüs Durağı" style="width:100%"><button class="ana" onclick="durakOlustur()">Durağı oluştur</button></details>'+
  '<details class="bolum" open><summary>Kahya hesabı aç</summary><label>Durak kodu</label><input id="khdurak" autocapitalize="characters" style="width:100%"><label>Kullanıcı adı</label><input id="khadi" autocapitalize="none" style="width:100%"><label>Şifre (en az 6 karakter)</label><input id="khsifre" style="width:100%"><button class="ana mavi" onclick="kahyaOlustur()">Hesabı aç</button><p class="kucuk">Kahya, durak kodu + kullanıcı adı + şifreyle girer. Şifreyi unutursa yeni bir kullanıcı adıyla yeni hesap aç.</p></details></div>'+alt;
 DINLE.push(cref('duraklar').onSnapshot(sn=>{DLIST={};sn.forEach(d=>DLIST[d.id]=d.data());const L=Object.entries(DLIST);
  $('dliste').innerHTML=L.length?L.map(([k,x])=>'<div class="satir"><b style="font-size:20px">'+esc(k)+'</b> <span class="kucuk">'+esc(x.ad||'')+'</span><div class="ikili" style="margin-top:8px"><button class="ana" style="margin:0" onclick="sahipDurakAc(\''+esc(k)+'\')">Aç</button><button class="ana kir" style="margin:0;flex:0 0 90px" onclick="durakSil(\''+esc(k)+'\')">Sil</button></div></div>').join(''):'<p>Henüz durak yok.</p>'},e=>{$('dliste').textContent='Okunamadı: '+e.code}));
}
async function durakOlustur(){const k=$('ydkod').value.trim().toUpperCase(),ad=$('ydad').value.trim();if(!k||!/^[A-Z0-9-]{2,20}$/.test(k)){alert('Durak kodu sadece harf, rakam ve tire olabilir (2-20 karakter).');return}
 const r=dref('duraklar/'+k);if((await r.get()).exists){alert(k+' zaten var.');return}
 const A0=bosAyar(ad||k);await r.set({ad:ad||k,ayar:A0,z:Date.now()});await dref('yolcuDuraklari/'+k).set(yolcuDurakVerisi(k,ad||k,A0));$('ydkod').value='';$('ydad').value='';$('khdurak').value=k;alert(k+' oluşturuldu. Şimdi kahya hesabını aç.')}
function durakSil(k){if(!confirm(k+' durağı silinsin mi? Ayarları gider (günlük listeler kalır).'))return;dref('duraklar/'+k).delete().catch(e=>alert(e.code))}
function sahipDurakAc(k){LS.set('sDurak',k);DURAK=k;durakAc()}
async function kahyaOlustur(){
 const d=$('khdurak').value.trim().toUpperCase(),k=$('khadi').value.trim(),s=$('khsifre').value;
 if(!d||!k||s.length<6){alert('Durak kodu, kullanıcı adı ve en az 6 karakter şifre gerekli.');return}
 if(!DLIST[d]){alert(d+' diye bir durak yok. Önce durağı oluştur.');return}
 let ik;try{ik=firebase.app('ikinci')}catch(e){ik=firebase.initializeApp(window.FIREBASE_AYAR,'ikinci')}
 try{const c=await ik.auth().createUserWithEmailAndPassword(kahyaEposta(d,k),s);await dref('kullanicilar/'+c.user.uid).set({durak:d,rol:'kahya',ad:k,z:Date.now()});await ik.auth().signOut();
  alert('Hesap açıldı.\nDurak kodu: '+d+'\nKullanıcı adı: '+k+'\nŞifre: '+s);$('khadi').value='';$('khsifre').value=''}
 catch(e){alert(e.code&&e.code.includes('email-already')?'Bu kullanıcı adı bu durakta zaten var.':hata(e))}
}

// ================= durak açılışı =================
function ust(baslik,alt2,sag){return '<div class="ust"><img src="sofor-ikon.svg" onerror="this.remove()"><div><h1>'+esc(baslik)+'</h1><p>'+esc(alt2)+'</p></div><div class="kod">'+(sag||'')+'</div></div>'}
function durakAc(){
 dinleKapat();TARIH=TARIH||bugun();
 tam('<h2>Durak yükleniyor…</h2>');
 let ilk=true;
 DINLE.push(dref(dp()).onSnapshot(d=>{const x=d.data();if(!x){if(ROL=='sofor'){LS.set('durak','');soforDurakSor()}else tam('<h2>Durak bulunamadı</h2><button class="ana" onclick="cikis()">Çıkış</button>');return}
  A=x.ayar||bosAyar(x.ad);A._ad=x.ad||DURAK;if(!HAT||!A.hatlar.find(h=>h.id==HAT))HAT=LS.get('hat_'+DURAK)||A.hatlar[0].id;if(!A.hatlar.find(h=>h.id==HAT))HAT=A.hatlar[0].id;if(kahyaMi()){yolcuDurakYayinla();planYayinla()}
  if(ilk){ilk=false;if(ROL=='sofor')cihazDinle();else{CIHAZ={d:'onay'};cihazListesiDinle();if(ROL=='kahya')kahyaCihazKaydet()}gunDinle()}else ciz()},e=>tam('<h2>Durak okunamadı</h2><p>'+esc(e.code)+'</p><button class="ana" onclick="cikis()">Çıkış</button>')));
}
function gunDinle(){if(GUNDIN)GUNDIN();if(!izinli()){kapi();return}
 GUNDIN=dref(dp('gunler',TARIH)).onSnapshot(d=>{const odak=document.activeElement;const yaziyor=odak&&$('kok').contains(odak)&&/INPUT|TEXTAREA/.test(odak.tagName);G=d.data()||{};clearTimeout(PLAN_T);PLAN_T=setTimeout(planYayinla,700);if(yaziyor&&kahyaMi())return;ciz();if(!OTOD){OTOD=true;setTimeout(otoTakip,0)}},e=>{G={};ciz();planYayinla()})}

// ================= şoför telefon onayı =================
function cihazDinle(){
 DINLE.push(dref(dp('cihazlar',USER.uid)).onSnapshot(d=>{const x=d.data(),onc=CIHAZ.d;
  if(!x)CIHAZ={d:'yok'};else if(x.onay)CIHAZ={d:'onay',plaka:x.plaka||''};else CIHAZ={d:'bekliyor',istek:x.istek||''};
  if(CIHAZ.d=='onay'){if(onc!='onay')gunDinle();else ciz()}else{takipDurdur();if(GUNDIN){GUNDIN();GUNDIN=null}kapi()}},()=>{CIHAZ={d:'yok'};kapi()}));
}
function kapi(){
 const kod='<div style="font-weight:700;opacity:.85;margin-top:18px">Telefon kodu</div><div class="kodkutu">'+telKod()+'</div>';
 const dk='<p style="opacity:.8;margin:0 0 10px">'+esc(A?A._ad:DURAK)+'</p>';
 if(CIHAZ.d=='bilinmiyor')tam('<h2>Kontrol ediliyor…</h2>'+dk);
 else if(CIHAZ.d=='bekliyor')tam('<h2>Onay bekleniyor</h2>'+dk+(CIHAZ.istek?'<p style="font-size:20px;font-weight:800">İstenen plaka: '+esc(CIHAZ.istek)+'</p>':'')+'<p style="opacity:.92">Kahyaya bu kodu söyle. Onaylayınca uygulama kendiliğinden açılır.</p>'+kod+'<br><button class="bag" onclick="cikis()">Durak değiştir</button>');
 else tam('<h2>Bu telefon kayıtlı değil</h2>'+dk+'<p style="opacity:.92">Şoför ekranını sadece kahyanın onayladığı telefonlar kullanabilir.</p><input id="istekPl" placeholder="Plakan (örn. 72)"><button class="ana" onclick="onayIste()">Onay iste</button>'+kod+'<br><button class="bag" onclick="cikis()">Durak değiştir</button>');
}
function onayIste(){const ist=($('istekPl').value||'').trim().toUpperCase();if(!ist){alert('Önce plakanı yaz.');return}
 dref(dp('cihazlar',USER.uid)).set({kod:telKod(),onay:false,plaka:'',istek:ist,model:cModel(),z:Date.now()}).catch(e=>alert('Gönderilemedi: '+hata(e)))}
function kahyaCihazKaydet(){const r=dref(dp('cihazlar',USER.uid));r.get().then(d=>{if(!d.exists)r.set({kod:telKod(),onay:true,plaka:'',istek:'',model:cModel(),ad:'Kahya',z:Date.now()})}).catch(()=>{})}
function cihazListesiDinle(){DINLE.push(cref(dp('cihazlar')).onSnapshot(sn=>{CLIST={};sn.forEach(d=>CLIST[d.id]=d.data());telYenile()},()=>{}))}
function telHtml(){
 const L=Object.entries(CLIST).sort((a,b)=>(b[1].z||0)-(a[1].z||0)),bek=L.filter(x=>!x[1].onay),ony=L.filter(x=>x[1].onay);
 const sat=(id,x,yeni)=>'<div class="satir"><b style="font-size:24px;letter-spacing:3px">'+esc(x.kod||'----')+'</b> <span class="kucuk">'+esc(x.model||'')+(x.ad?' · '+esc(x.ad):'')+(USER&&id===USER.uid?' · bu telefon':'')+'</span>'+(yeni&&x.istek?'<div style="font-weight:800;color:var(--koyu)">İstediği plaka: '+esc(x.istek)+'</div>':'')+
  '<div class="arac"><input id="tp_'+id+'" style="width:110px" placeholder="Plaka" value="'+esc(x.plaka||x.istek||'')+'"><button class="ana '+(yeni?'':'mavi')+'" style="margin:0;width:auto;padding:10px 14px;font-size:16px" onclick="telOnay(\''+id+'\')">'+(yeni?'Onayla':'Kaydet')+'</button><button class="ana kir" style="margin:0;width:auto;padding:10px 14px;font-size:16px" onclick="telSil(\''+id+'\')">Sil</button></div></div>';
 return '<p class="kucuk">Şoförün istediği plaka kutuya kendiliğinden yazılır. Kodu şoförün ekranındakiyle karşılaştır, doğruysa onayla.</p><h3>Onay bekleyenler ('+bek.length+')</h3>'+(bek.length?bek.map(x=>sat(x[0],x[1],true)).join(''):'<p class="kucuk">Bekleyen yok.</p>')+'<h3>Onaylı telefonlar ('+ony.length+')</h3>'+(ony.length?ony.map(x=>sat(x[0],x[1],false)).join(''):'<p class="kucuk">Henüz yok.</p>');
}
function telYenile(){const b=document.querySelector('details[data-k=tel]');if(!b)return;const ae=document.activeElement;if(ae&&b.contains(ae)&&ae.tagName=='INPUT'){setTimeout(telYenile,1500);return}
 const n=Object.values(CLIST).filter(x=>!x.onay).length;b.innerHTML='<summary>📱 Telefonlar'+(n?' <span class="rozet">'+n+' bekliyor</span>':'')+'</summary>'+telHtml()}
function telOnay(id){const p=($('tp_'+id).value||'').trim().toUpperCase();if(!p&&!(USER&&id===USER.uid)){alert('Önce plakayı yaz.');return}dref(dp('cihazlar',id)).update({onay:true,plaka:p}).catch(e=>alert('Kaydedilemedi: '+hata(e)))}
function telSil(id){const x=CLIST[id]||{};if(USER&&id===USER.uid){alert('Kendi telefonunu silemezsin.');return}if(!confirm((x.kod||'')+' kodlu telefon'+(x.plaka?' ('+x.plaka+')':'')+' silinsin mi?'))return;dref(dp('cihazlar',id)).delete().catch(e=>alert('Silinemedi: '+hata(e)))}

// ================= günün durumu =================
const hatAyar=()=>A.hatlar.find(h=>h.id==HAT)||A.hatlar[0];
const gunHat=(h)=>((G.hatlar||{})[(h||hatAyar()).id])||{};
function gtBul(h){return GORUNUM.gt||gunHat(h).gunTuru||G.gunTuru||otoGunTuru(A,TARIH)}
function mvBul(){return GORUNUM.mv||G.mevsim||otoMevsim(A,TARIH)}
function gunYaz(f){if(!kahyaMi())return;f(G);G.z=Date.now();clearTimeout(KAYIT_T);KAYIT_T=setTimeout(()=>dref(dp('gunler',TARIH)).set(G).catch(e=>alert('Kaydedilemedi: '+hata(e))),500)}
function gunTuruSec(id){if(kahyaMi())gunYaz(g=>{g.gunTuru=id;GORUNUM.gt=null});else GORUNUM.gt=id;ciz()}
function mevsimSec(id){if(kahyaMi())gunYaz(g=>{g.mevsim=id;GORUNUM.mv=null});else GORUNUM.mv=id;ciz()}
function hatSec(id){HAT=id;LS.set('hat_'+DURAK,id);ciz()}
function tarihSec(t){if(!t)return;TARIH=t;GORUNUM={gt:null,mv:null};G={};gunDinle()}
function ac(k){return ACIK[k]?' open':''}
document.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.k){ACIK[d.dataset.k]=d.open?1:0}},true);

// ================= ana ekran =================
function ciz(){
 if(!A||!izinli()){if(A)kapi();return}
 const h=hatAyar(),gt=gtBul(h),mv=mvBul(),gh=gunHat(h),K=kahyaMi(),dis=K?'':' disabled';
 document.documentElement.style.setProperty('--hat',h.renk||'#1fa36a');
 const sag='<b>'+esc(DURAK)+'</b>'+(ROL=='sahip'?'<button onclick="LS.set(\'sDurak\',\'\');sahipPanel()">Duraklar</button>':'')+'<button onclick="cikis()">'+(ROL=='sofor'?'Durak değiştir':'Çıkış')+'</button>';
 let x=ust(A._ad,ROL=='sofor'?'Şoför ekranı':(ROL=='kahya'?'Kahya ekranı':'Sahip – '+DURAK),sag)+'<div class="ic">';
 x+='<div class="sekmeler">'+A.gunTurleri.map(g=>'<button class="'+(g.id==gt?'aktif':'')+'" onclick="gunTuruSec(\''+g.id+'\')">'+esc(g.ad)+'</button>').join('')+'</div>';
 if(A.mevsimler&&A.mevsimler.length)x+='<div class="sekmeler">'+A.mevsimler.map(m=>'<button class="'+(m.id==mv?'aktif':'')+'" onclick="mevsimSec(\''+m.id+'\')">'+esc(m.ad)+'</button>').join('')+'</div>';
 if(A.hatlar.length>1)x+='<div class="sekmeler hatlar">'+A.hatlar.map(k=>'<button class="'+(k.id==h.id?'aktif':'')+'" style="'+(k.id==h.id?'background:'+esc(k.renk||'#1fa36a'):'')+'" onclick="hatSec(\''+k.id+'\')">'+esc(k.ad)+'</button>').join('')+'</div>';
 x+='<div style="margin:6px 0"><label>Tarih</label><input type="date" value="'+TARIH+'" onchange="tarihSec(this.value)" style="width:100%"></div>';
 // benim aracım
 const ben=TAKIP.p||CIHAZ.plaka||LS.get('benim_'+DURAK);
 x+='<details class="bolum" data-k="takip"'+ac('takip')+'><summary>Benim aracım – takip</summary><label>Plakam</label><input id="benim" inputmode="numeric" value="'+esc(ben)+'" style="width:100%"><div class="ikili"><button class="ana" onclick="takipBaslat(false)">'+(TAKIP.t?'Takibi yenile':'Takibi başlat')+'</button>'+(TAKIP.t?'<button class="ana gri" onclick="takipDurdur();ciz()">Durdur</button>':'')+'</div><div id="sayac"></div><div id="benimSefer"></div></details>';
 // seferler
 const P=planHesapla(h,gt,mv,gh);window.SONPLAN=P;
 const ozet=P.canli.map(c=>'<tr'+(c.p==ben?' class="ben"':'')+'><td>'+esc(c.p)+'</td><td>'+esc((h.turler.find(t=>t.id==c.k)||{}).ad||'')+'</td><td>'+(P.sonC[c.p]!==undefined?fmt(P.sonC[c.p]):'-')+'</td><td>'+(P.say[c.p]||0)+'</td></tr>').join('');
 const tum=P.satir.map(r=>r.p===null?'<tr class="bos"><td>'+fmt(r.s)+'</td><td colspan="3">Araç yok</td></tr>':'<tr class="'+(r.p==ben?'ben':(r.gec?'uyari':''))+'"><td>'+fmt(r.s)+'</td><td>'+esc(r.p)+'</td><td>'+r.n+'</td><td>'+(r.gec?r.gec+' dk geç dönüş':'')+'</td></tr>').join('');
 x+='<details class="bolum" data-k="seferler"'+ac('seferler')+'><summary>Seferler</summary>'+(P.canli.length?'<h3>Araçların son seferi</h3><table><tr><th>Araç</th><th>Tür</th><th>Son</th><th>Top.</th></tr>'+ozet+'</table><h3>Tüm seferler ('+P.satir.length+')</h3><table><tr><th>Saat</th><th>Araç</th><th>Sv.</th><th>Uyarı</th></tr>'+tum+'</table>':'<p class="kucuk">Bu gün için '+esc(h.ad)+' plaka listesi girilmemiş.</p>')+'</details>';
 // sıra
 const pl=String(gh.plakalar||'').split(/[\s,;]+/).filter(v=>v);
 x+='<details class="bolum" data-k="sira"'+ac('sira')+'><summary>Sıra ve araçlar</summary>'+(K?'':'<p class="kucuk">🔒 Sadece kahya değiştirebilir.</p>')+'<label>Plakalar, sırasıyla (boşluk ya da virgülle)</label><textarea id="plakalar"'+dis+' oninput="sirayaYaz()">'+esc(gh.plakalar||'')+'</textarea>'+
  pl.map(p=>'<div class="arac"><b>'+esc(p)+'</b><select'+dis+' onchange="turYaz(\''+esc(p)+'\',this.value)">'+h.turler.map(t=>'<option value="'+t.id+'"'+(((gh.tur||{})[p]||h.turler[0].id)==t.id?' selected':'')+'>'+esc(t.ad)+'</option>').join('')+'</select><span class="kucuk">Arızalı</span><input type="checkbox"'+dis+((gh.ariza||{})[p]?' checked':'')+' onchange="arizaYaz(\''+esc(p)+'\',this.checked)"></div>').join('')+'</details>';
 // günün ayarları
 x+='<details class="bolum" data-k="gunluk"'+ac('gunluk')+'><summary>Günün değişiklikleri</summary>'+(K?'':'<p class="kucuk">🔒 Sadece kahya değiştirebilir.</p>')+
  (A.gunTurleri.length>1?'<label>Bu hat bugün hangi gün türüyle çalışsın (resmi tatil vb.)</label><select'+dis+' onchange="hatGunTuru(this.value)" style="width:100%"><option value="">Günün genel ayarı</option>'+A.gunTurleri.map(g=>'<option value="'+g.id+'"'+(gh.gunTuru==g.id?' selected':'')+'>'+esc(g.ad)+'</option>').join('')+'</select>':'')+
  '<label>Günün sefer aralıkları (tarifenin yerine geçer)</label><textarea id="gbant"'+dis+' placeholder="08:30-16:30 7">'+esc(BANT_YAZ(gh.bant))+'</textarea>'+
  '<label>Günün uzatması</label><textarea id="guzat"'+dis+' placeholder="07:30-09:00 '+esc((h.duraklar[0]||{ad:'Durak'}).ad)+'=3">'+esc(UZ_YAZ(gh.uzat,false))+'</textarea>'+
  (K?'<button class="ana mavi" onclick="gunlukKaydet()">Kaydet</button>':'')+'<p class="kucuk">Aralık örneği: <b>08:30-16:30 7</b> (o saatler arası 7 dakikada bir). Uzatma örneği: <b>07:30-09:00 Metrobüs=2, Atrium=5</b> (o saatlerde kalkan seferde o duraktan itibaren toplam eklenen dakika).</p></details>';
 if(K){
  x+='<details class="bolum" data-k="tel"'+ac('tel')+'><summary>📱 Telefonlar</summary></details>';
   x+='<details class="bolum" data-k="qr"'+ac('qr')+'><summary>🖨 Yolcu QR afişleri</summary><p class="kucuk">Duraktaki yolcular kamerayla okutup durağı açar. Afişi yazdırıp as.</p><button class="ana mavi" onclick="qrAc()">QR afişlerini aç</button></details>';
  x+='<details class="bolum" data-k="veri"'+ac('veri')+'><summary>Günlük listeleri kopyala / yapıştır</summary><div class="ikili"><button class="ana lac" onclick="veriKopyala()">Verileri kopyala</button><button class="ana" onclick="veriYapistir()">Verileri yapıştır</button></div><textarea id="veriKutu" placeholder="Yapıştırılacak veriyi buraya koy, sonra Verileri yapıştır tuşuna bas."></textarea></details>';
  x+='<details class="bolum" data-k="ayar"'+ac('ayar')+'><summary>⚙️ Durak ayarları</summary>'+ayarHtml()+'</details>';
 }
 x+=carpiHtml(h)+'<div class="kucuk" style="text-align:center;margin:12px 0">'+(ROL=='sofor'?'Bu telefon onaylı · '+esc(CIHAZ.plaka||''):'')+'</div></div>'+alt;
 $('kok').innerHTML=x;telYenile();sayacGuncelle();
}
function sirayaYaz(){const v=$('plakalar').value;gunYaz(g=>{g.hatlar=g.hatlar||{};const h=g.hatlar[HAT]=g.hatlar[HAT]||{};h.plakalar=v})}
function turYaz(p,v){gunYaz(g=>{g.hatlar=g.hatlar||{};const h=g.hatlar[HAT]=g.hatlar[HAT]||{};h.tur=h.tur||{};h.tur[p]=v});ciz()}
function arizaYaz(p,v){gunYaz(g=>{g.hatlar=g.hatlar||{};const h=g.hatlar[HAT]=g.hatlar[HAT]||{};h.ariza=h.ariza||{};if(v)h.ariza[p]=true;else delete h.ariza[p]});ciz()}
function hatGunTuru(v){gunYaz(g=>{g.hatlar=g.hatlar||{};const h=g.hatlar[HAT]=g.hatlar[HAT]||{};if(v)h.gunTuru=v;else delete h.gunTuru});ciz()}
function gunlukKaydet(){try{const b=BANT_OKU($('gbant').value),u=UZ_OKU($('guzat').value,false);gunYaz(g=>{g.hatlar=g.hatlar||{};const h=g.hatlar[HAT]=g.hatlar[HAT]||{};h.bant=b;h.uzat=u});setTimeout(ciz,50);alert('Kaydedildi.')}catch(e){alert(e)}}
document.addEventListener('focusout',e=>{if(e.target&&e.target.id=='plakalar')setTimeout(ciz,50)});

// ================= günlük veri kopyala/yapıştır =================
async function veriKopyala(){
 const s=await cref(dp('gunler')).get();const o={};s.forEach(d=>{if(d.id>=TARIH){const v=Object.assign({},d.data());delete v.z;o[d.id]=v}});
 const t=JSON.stringify(o);$('veriKutu').value=t;try{await navigator.clipboard.writeText(t);alert(Object.keys(o).length+' gün kopyalandı ('+TARIH+' ve sonrası).')}catch(e){$('veriKutu').select();alert('Kutudaki yazıyı elle kopyala.')}
}
async function veriYapistir(){
 let t=$('veriKutu').value.trim();if(!t){try{t=(await navigator.clipboard.readText()).trim()}catch(e){}}
 if(!t){alert('Önce veriyi kutuya yapıştır.');return}
 let o;try{o=JSON.parse(t)}catch(e){alert('Veri bozuk, tamamını kopyaladığından emin ol.');return}
 const gun=Object.keys(o).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k));if(!gun.length){alert('Veride tarih bulunamadı.');return}
 const hid=new Set(A.hatlar.map(h=>h.id));const bil=[];gun.forEach(k=>Object.keys((o[k]||{}).hatlar||{}).forEach(h=>{if(!hid.has(h))bil.push(k+': '+h)}));
 if(bil.length&&!confirm('Bu duraktaki hatlarla uyuşmayan hat kodları var:\n'+bil.slice(0,5).join('\n')+'\nYine de yapıştırılsın mı?'))return;
 if(!confirm(gun.length+' gün yazılacak ('+gun[0]+(gun.length>1?' … '+gun[gun.length-1]:'')+'). O günlerdeki eski liste silinir. Devam?'))return;
 for(const k of gun){const v=Object.assign({},o[k],{z:Date.now()});await dref(dp('gunler',k)).set(v);await dref(dp('plan',k)).set(planVerisi(A,k,v))}
 $('veriKutu').value='';alert(gun.length+' gün yüklendi.');
}

// ================= durak ayarları (kahya) =================
let AYAR_TASLAK=null;
function ayarHtml(){
 const T=AYAR_TASLAK||A;
 let x='<p class="kucuk">Buradaki değişiklikler "Ayarları kaydet" tuşuna basınca bütün şoförlere geçer. İstersen bana durağını anlat, ben hazır ayar yazayım; sen de "Ayarları yapıştır" ile tek seferde yükle.</p>'+
  '<div class="ikili"><button class="ana lac" onclick="ayarKopyala()">Ayarları kopyala</button><button class="ana" onclick="ayarYapistirAc()">Ayarları yapıştır</button></div><div id="ayYap"></div>'+
  '<label>Durak adı</label><input id="a_ad" style="width:100%" value="'+esc(T.durakAdi||A._ad)+'">'+
  '<label>Konum yolcuya kaç dakika kala açılsın</label><input id="a_konum" type="number" style="width:100px" value="'+esc(T.konumDk==null?5:T.konumDk)+'">'+
  '<label>Araç kodları (plaka = yolcu kodu) — yolcuya sadece kod görünür</label><textarea id="a_kodlar" style="min-height:70px" placeholder="72 = M-14">'+esc(KOD_YAZ(T.aracKodlari))+'</textarea><p class="kucuk">Her satır: <b>plaka = kod</b>. Yolcu plakayı hiç görmez.</p>'+
  '<label>Durağın konumu (konumdan seçim için) — enlem, boylam</label><input id="a_konum2" placeholder="41.0200, 28.5900" style="width:100%" value="'+esc(KONUM_YAZ(T.konum))+'">'+
  '<label>Durak noktalarının koordinatları (GPS için; şimdilik boş bırakabilirsin)</label><textarea id="a_durkon" style="min-height:60px" placeholder="Metrobüs = 41.0200, 28.5900">'+esc(KOORD_YAZ(T.durakKonumlari))+'</textarea>'+
  '<label>Gün türleri (üstteki tuşlar)</label><textarea id="a_gt" style="min-height:80px">'+esc(GT_YAZ(T))+'</textarea><p class="kucuk">Her satır: <b>kod = Tuş adı: günler</b>. Örnek: <b>hi = Hafta içi: Pzt Sal Çar Per Cum</b>. Her gün ayrı tuş istersen 7 satır yaz.</p>'+
  '<label>Mevsimler (boş bırakırsan yaz/kış tuşu çıkmaz)</label><textarea id="a_mv" style="min-height:60px">'+esc(MV_YAZ(T))+'</textarea><p class="kucuk">Örnek: <b>kis = Kış: Eki Kas Ara Oca Şub Mar Nis</b>. Mevsime özel saat için tarifede <b>[hi_kis]</b> yaz.</p>';
 T.hatlar.forEach((h,i)=>{x+='<div class="hatkutu" style="border-color:'+esc(h.renk||'#d5dde5')+'"><h3>'+(i+1)+'. hat <span class="kucuk">(kod: '+esc(h.id)+')</span></h3>'+
  '<div class="ikili"><div><label>Hat adı</label><input id="h_ad_'+i+'" style="width:100%" value="'+esc(h.ad)+'"></div><div style="flex:0 0 90px"><label>Renk</label><input id="h_renk_'+i+'" type="color" style="width:100%;height:46px;padding:3px" value="'+esc(h.renk||'#1e63b8')+'"></div></div>'+
  '<div class="ikili"><div><label>Kalkış yeri</label><input id="h_kalkis_'+i+'" style="width:100%" value="'+esc(h.kalkis||'')+'"></div><div><label>Son sefer</label><input id="h_son_'+i+'" style="width:100%" value="'+esc(h.sonSefer)+'"></div><div><label>Tur (dk)</label><input id="h_tur_'+i+'" type="number" style="width:100%" value="'+esc(h.turSuresi)+'"></div></div>'+
  '<label>Araç türleri ve son kalkış saatleri (ilk satır varsayılan)</label><textarea id="h_turler_'+i+'" style="min-height:70px">'+esc(TUR_YAZ(h))+'</textarea><p class="kucuk">Örnek: <b>nobetci = Nöbetçi: 23:00</b></p>'+
  '<label>Duraklar ve kalkıştan kaç dakika sonra</label><textarea id="h_dur_'+i+'">'+esc(DUR_YAZ(h))+'</textarea><p class="kucuk">Örnek: <b>Metrobüs: 30</b>. Son durak tur süresidir.</p>'+
  '<label>Sefer saatleri</label><textarea id="h_tar_'+i+'" style="min-height:160px">'+esc(TAR_YAZ(h))+'</textarea><p class="kucuk">Her gün türü için <b>[kod]</b> satırı, altına <b>sabit:</b> ilk saatler, sonra <b>07:30-08:30 5</b> gibi aralık satırları (5 dakikada bir). 7,5 gibi küsurat olur.</p>'+
  '<label>Standart uzatmalar</label><textarea id="h_uz_'+i+'">'+esc(UZ_YAZ(h.uzatmalar,true))+'</textarea><p class="kucuk">Örnek: <b>hi 07:24-08:30 Metrobüs=2, Atrium=6</b>. Başa gün türü kodu (birden çok: <b>hi,cmt</b>; her gün: <b>hepsi</b>).</p>'+
  (T.hatlar.length>1?'<button class="ana kir" style="padding:10px;font-size:16px" onclick="hatSil('+i+')">Bu hattı sil</button>':'')+'</div>'});
 const C=T.carpi||{};
 x+='<button class="ana gri" style="padding:10px;font-size:16px" onclick="hatEkle()">+ Hat ekle</button>'+
  '<div class="hatkutu"><h3>Çarpı kuralı</h3><label>Çarpı nasıl hesaplanır</label><select id="c_tur" style="width:100%"><option value="sefer"'+(C.tur!='dakika'?' selected':'')+'>Sefer başı sabit ücret</option><option value="dakika"'+(C.tur=='dakika'?' selected':'')+'>Dakika başı ücret</option></select>'+
  '<div class="ikili"><div><label>Ücret (TL)</label><input id="c_ucret" type="number" style="width:100%" value="'+esc(C.ucret||0)+'"></div><div><label>Tolerans (dk)</label><input id="c_tol" type="number" style="width:100%" value="'+esc(C.tolerans||0)+'"></div></div>'+
  '<label>Durağa özel not</label><textarea id="c_not" style="min-height:60px">'+esc(C.not||'')+'</textarea></div>'+
  '<button class="ana" onclick="ayarKaydet()">Ayarları kaydet</button>'+(AYAR_TASLAK?'<button class="ana gri" onclick="AYAR_TASLAK=null;ciz()">Değişikliklerden vazgeç</button>':'');
 return x;
}
function formdanAyar(){
 const T=JSON.parse(JSON.stringify(AYAR_TASLAK||A));delete T._ad;
 T.durakAdi=$('a_ad').value.trim();T.konumDk=+$('a_konum').value||0;T.gunTurleri=GT_OKU($('a_gt').value);T.mevsimler=MV_OKU($('a_mv').value);
 T.aracKodlari=KOD_OKU($('a_kodlar').value);T.konum=KONUM_OKU($('a_konum2').value);T.durakKonumlari=KOORD_OKU($('a_durkon').value);
 T.hatlar=T.hatlar.map((h,i)=>Object.assign(h,{ad:$('h_ad_'+i).value.trim()||h.ad,renk:$('h_renk_'+i).value,kalkis:$('h_kalkis_'+i).value.trim(),sonSefer:$('h_son_'+i).value.trim(),turSuresi:+$('h_tur_'+i).value||0,
  turler:TUR_OKU($('h_turler_'+i).value),duraklar:DUR_OKU($('h_dur_'+i).value),tarife:TAR_OKU($('h_tar_'+i).value),uzatmalar:UZ_OKU($('h_uz_'+i).value,true)}));
 T.carpi={tur:$('c_tur').value,ucret:+$('c_ucret').value||0,tolerans:+$('c_tol').value||0,not:$('c_not').value};
 return T;
}
async function ayarKaydet(T){
 try{T=T||formdanAyar()}catch(e){alert('Düzeltmen gereken yer: '+e);return}
 const H=ayarDenetle(T);if(H.length){alert('Kaydedilmedi, şunları düzelt:\n• '+H.slice(0,8).join('\n• '));return}
 try{await dref(dp()).update({ayar:T,ad:T.durakAdi||A._ad});A=Object.assign({},T,{_ad:T.durakAdi||A._ad});AYAR_TASLAK=null;await yolcuDurakYayinla();await planYayinla();alert('Ayarlar kaydedildi. Yolcu ekranı güncellendi.')}catch(e){alert('Kaydedilemedi: '+hata(e))}
}
function hatEkle(){try{AYAR_TASLAK=formdanAyar()}catch(e){alert(e);return}const y=bosAyar().hatlar[0];y.id='hat'+(AYAR_TASLAK.hatlar.length+1);while(AYAR_TASLAK.hatlar.some(h=>h.id==y.id))y.id+='x';y.ad=(AYAR_TASLAK.hatlar.length+1)+'. hat';
 y.tarife={};AYAR_TASLAK.gunTurleri.forEach(g=>y.tarife[g.id]={sabit:['07:00'],bantlar:[{bas:'07:00',bit:'22:00',aralik:10}]});AYAR_TASLAK.hatlar.push(y);ACIK.ayar=1;ciz()}
function hatSil(i){try{AYAR_TASLAK=formdanAyar()}catch(e){alert(e);return}if(!confirm(AYAR_TASLAK.hatlar[i].ad+' silinsin mi? Kaydet tuşuna basınca kesinleşir.'))return;AYAR_TASLAK.hatlar.splice(i,1);ciz()}
async function ayarKopyala(){const T=JSON.parse(JSON.stringify(A));delete T._ad;const t=JSON.stringify(T);try{await navigator.clipboard.writeText(t);alert('Ayarlar kopyalandı.')}catch(e){$('ayYap').innerHTML='<textarea style="min-height:140px">'+esc(t)+'</textarea><p class="kucuk">Kutudaki yazıyı elle kopyala.</p>'}}
function ayarYapistirAc(){$('ayYap').innerHTML='<textarea id="ayKutu" style="min-height:140px" placeholder="Hazır ayarı buraya yapıştır"></textarea><button class="ana mavi" onclick="ayarYapistir()">Bu ayarı yükle</button>';$('ayKutu').focus()}
function ayarYapistir(){
 let T;try{T=JSON.parse($('ayKutu').value.trim())}catch(e){alert('Ayar bozuk, tamamını kopyaladığından emin ol.');return}
 if(T.ayar&&T.ayar.hatlar)T=T.ayar;
 const H=ayarDenetle(T);if(H.length){alert('Bu ayarda hata var:\n• '+H.slice(0,8).join('\n• '));return}
 const eski=new Set(A.hatlar.map(h=>h.id)),yeni=T.hatlar.map(h=>h.id).filter(id=>!eski.has(id));
 if(!confirm('Durağın bütün ayarları değişecek:\n'+T.hatlar.length+' hat ('+T.hatlar.map(h=>h.ad).join(', ')+'), '+T.gunTurleri.length+' gün türü.'+(yeni.length?'\nYeni hat kodları: '+yeni.join(', '):'')+'\nDevam?'))return;
 ayarKaydet(T);
}

// ================= çarpı (kural görünümü, hesap sonraki adım) =================
function carpiHtml(h){const C=A.carpi||{};
 return '<details class="bolum" data-k="carpi"'+ac('carpi')+'><summary>Çarpı kuralı</summary><p>'+(C.tur=='dakika'?'Gecikilen her dakika için <b>'+esc(C.ucret||0)+' TL</b>':'Sefer başı <b>'+esc(C.ucret||0)+' TL</b>')+(C.tolerans?', '+esc(C.tolerans)+' dakikaya kadar gecikme sayılmaz':'')+'.</p>'+(C.not?'<p class="kucuk">'+esc(C.not)+'</p>':'')+'<p class="kucuk">Otomatik çarpı hesabı bir sonraki sürümde gelecek.</p></details>'}

// ================= takip =================
function otoTakip(){const p=CIHAZ.plaka||LS.get('benim_'+DURAK);if(!p||TAKIP.t)return;const el=$('benim');if(el&&!el.value)el.value=p;takipBaslat(true)}
async function kilitAl(p,oto){
 const ref=dref(dp('takip',p)),sahip=ROL=='sofor'&&!!CIHAZ.plaka&&CIHAZ.plaka==p;
 try{const x=(await ref.get()).data();if(x&&x.uid!==USER.uid&&Date.now()-(x.z||0)<90000&&(!sahip||oto))return x.sahip?'sahip':'dolu';
  await ref.set({uid:USER.uid,kod:telKod(),sahip,z:Date.now()});return true}catch(e){return true}
}
async function takipBaslat(oto){
 const p=(($('benim')||{}).value||'').trim().toUpperCase();if(!p){if(!oto)alert('Plakanı yaz.');return}
 const P=window.SONPLAN&&window.SONPLAN.PLAN[p];
 if(!P||!P.length){if(!oto)alert(p+' için bugün '+hatAyar().ad+' hattında sefer yok. Doğru hattı ve tarihi seç.');return}
 const r=await kilitAl(p,oto);
 if(r!==true){const m=p+' plakasını şu an '+(r=='sahip'?'aracın sahibi':'başka bir telefon')+' takip ediyor. Bir plakayı aynı anda tek telefon takip edebilir.';if(oto)uyarGoster(m);else alert(m);return}
 if(TAKIP.kil&&TAKIP.kil!==p)kilitBirak(TAKIP.kil);
 takipDurdur(true);LS.set('benim_'+DURAK,p);
 TAKIP.p=p;TAKIP.h=hatAyar();TAKIP.gt=gtBul(TAKIP.h);TAKIP.gh=gunHat(TAKIP.h);TAKIP.plan=P.slice();TAKIP.kil=p;TAKIP.uyar={};TAKIP.olay=null;
 const ref=dref(dp('takip',p));
 TAKIP.kilDin=ref.onSnapshot(d=>{const x=d.data();if(x&&x.uid!==USER.uid&&TAKIP.kil===p){takipDurdur();uyarGoster(p+' plakasını artık '+(x.sahip?'aracın sahibi':'başka bir telefon')+' takip ediyor. Senin takibin kapatıldı.');try{navigator.vibrate&&navigator.vibrate([300,150,300])}catch(e){}}},()=>{});
 TAKIP.kilHb=setInterval(()=>{if(TAKIP.kil===p)ref.update({z:Date.now()}).catch(()=>{})},30000);
 try{if(window.Notification&&Notification.permission=='default')Notification.requestPermission()}catch(e){}
 if(navigator.geolocation)TAKIP.gps=navigator.geolocation.watchPosition(pos=>{TAKIP.konum=[pos.coords.latitude,pos.coords.longitude];canliGonder()},()=>{},{enableHighAccuracy:true,maximumAge:5000});
 TAKIP.t=setInterval(sayacGuncelle,1000);ciz();
}
function kilitBirak(p){if(!p||!USER)return;const ref=dref(dp('takip',p));ref.get().then(d=>{const x=d.data();if(x&&x.uid===USER.uid)ref.delete()}).catch(()=>{})}
function takipDurdur(sessiz){
 clearInterval(TAKIP.t);clearInterval(TAKIP.kilHb);if(TAKIP.kilDin)TAKIP.kilDin();
 if(TAKIP.gps!==null&&TAKIP.gps!==undefined){try{navigator.geolocation.clearWatch(TAKIP.gps)}catch(e){}}
 if(TAKIP.pay&&TAKIP.p&&FS&&DURAK)dref(dp('canli',TAKIP.p)).delete().catch(()=>{});
  const kod=TAKIP.p&&A&&(A.aracKodlari||{})[TAKIP.p];if(kod&&FS&&DURAK)dref(dp('yolcu',kod)).delete().catch(()=>{});
 if(!sessiz&&TAKIP.kil)kilitBirak(TAKIP.kil);
 TAKIP={p:null,t:null,plan:null,kil:sessiz?TAKIP.kil:null,kilDin:null,kilHb:null,gps:null,konum:null,cg:0,pay:false,uyar:{},olay:null};
}
function uyarGoster(m){ACIK.takip=1;const s=$('sayac');if(s)s.innerHTML='<div class="uyar">⚠ '+esc(m)+'</div>';const d=s&&s.closest('details');if(d)d.open=true}
// aktif sefer: kalkıştan 15 sn önce başlar, tur süresi dolunca durur, en fazla 10 dk "tamamlandı" kalır
function aktifSefer(s){
 const L=TAKIP.plan||[];
 for(let i=0;i<L.length;i++){const x=L[i],{D,tur}=seferDuraklari(TAKIP.h,TAKIP.gt,x,TAKIP.gh),nx=L[i+1];const son=Math.min(x+tur*60+600,nx!==undefined?nx-300:1e9);if(s>=x-15&&s<son)return {x,D,tur}}
 return null;
}
function konumPenceresi(s){const dk=(A.konumDk==null?5:+A.konumDk)*60;return (TAKIP.plan||[]).some(x=>{const {tur}=seferDuraklari(TAKIP.h,TAKIP.gt,x,TAKIP.gh);return s>=x-dk&&s<=x+tur*60})}
function canliGonder(){
 if(!TAKIP.p||!FS)return;const s=simdiSn(),ref=dref(dp('canli',TAKIP.p));
 if(!konumPenceresi(s)){if(TAKIP.pay){TAKIP.pay=false;ref.delete().catch(()=>{})}return}
 TAKIP.pay=true;if(!TAKIP.konum||Date.now()-TAKIP.cg<15000)return;TAKIP.cg=Date.now();
 const a=aktifSefer(s);ref.set({lat:TAKIP.konum[0],lng:TAKIP.konum[1],z:Date.now(),hat:TAKIP.h.id,dep:a?a.x:null}).catch(()=>{});
}
// yolcuya açık "araç durakta" olayı: plaka yok, sadece kod
function olayYayinla(s,a){
 if(!FS||!DURAK||!A||!TAKIP.p)return;
 const kod=(A.aracKodlari||{})[TAKIP.p];if(!kod)return;
 let ad=null,varis=null;
 if(a)for(const d of a.D){const v=a.x+d[1]*60;if(s>=v-20&&s<v+180){ad=d[0];varis=v;break}}
 const olay=ad?kod+'|'+a.x+'|'+ad+'|'+varis:null;
 if(olay===TAKIP.olay)return;TAKIP.olay=olay;
 const ref=dref(dp('yolcu',kod));
 if(!olay){ref.delete().catch(()=>{});return}
 ref.set({kod,hat:TAKIP.h.id,hatAdi:TAKIP.h.ad,renk:TAKIP.h.renk||'',durak:ad,olay,varis,z:Date.now(),durum:'durakta',konum:TAKIP.konum?{lat:TAKIP.konum[0],lng:TAKIP.konum[1]}:null}).catch(()=>{});
}
function sayacGuncelle(){
 const el=$('sayac'),bs=$('benimSefer');if(!el||!TAKIP.t||!TAKIP.plan)return;
 const s=simdiSn();if(TAKIP.pay&&!konumPenceresi(s))canliGonder();
 if(bs)bs.innerHTML='<h3>'+esc(TAKIP.p)+' – bugünkü seferlerin</h3><p style="font-size:20px;line-height:1.6">'+TAKIP.plan.map(x=>x<s-60?'<span style="opacity:.45">'+fmt(x)+'</span>':'<b>'+fmt(x)+'</b>').join(' · ')+'</p>';
 const a=aktifSefer(s);olayYayinla(s,a);
 if(a){const e=s-a.x;
  if(e>=a.tur*60){el.innerHTML='<div class="sayi">'+String(Math.floor(a.tur)).padStart(2,'0')+':'+String(Math.round(a.tur%1*60)).padStart(2,'0')+'</div><div class="etiket">Sefer tamamlandı</div><p style="text-align:center">'+fmt(a.x)+' seferi</p>';return}
  let ad=(TAKIP.h.kalkis||'Kalkış')+' – kalkış',hedef=a.x;if(e>=0){const d=a.D.find(q=>q[1]*60>e)||a.D[a.D.length-1];ad=d[0];hedef=a.x+d[1]*60}
  const m=Math.abs(e),k=Math.round(hedef-s);
  el.innerHTML='<div class="sayi">'+(e<0?'-':'')+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')+'</div><div class="etiket">'+esc(ad)+'</div><p style="text-align:center;font-size:20px">Plan: '+fmt(hedef)+(k>=0?' – kalan '+Math.floor(k/60)+':'+String(k%60).padStart(2,'0'):'')+'</p>'+
   '<table style="color:var(--lac)"><tr><th>Durak</th><th>Plan</th></tr>'+a.D.map(d=>'<tr'+(d[0]==ad?' class="ben"':'')+'><td>'+esc(d[0])+'</td><td>'+fmt(a.x+d[1]*60)+'</td></tr>').join('')+'</table>';return}
 const sonraki=TAKIP.plan.find(x=>x>=s);
 if(sonraki===undefined){el.innerHTML='<p style="font-size:20px;text-align:center">Bugün başka seferin yok.</p>';return}
 const kalan=sonraki-s;
 if(kalan<=300&&!TAKIP.uyar[sonraki]){TAKIP.uyar[sonraki]=1;bip(880,.6);setTimeout(()=>bip(880,.6),800);try{navigator.vibrate&&navigator.vibrate([500,200,500])}catch(e){}try{if(window.Notification&&Notification.permission=='granted')new Notification('5 dakika kaldı',{body:TAKIP.p+' – '+fmt(sonraki)+' seferi'})}catch(e){}}
 if(kalan<=15){el.innerHTML='<div class="sayi" style="color:#ff6b6b">'+kalan+'</div><p style="text-align:center">'+fmt(sonraki)+' seferi</p>';if(kalan>0)bip(kalan<=5?1200:700,.15);return}
 el.innerHTML='<p style="text-align:center;margin:4px 0">Sıradaki seferin</p><div class="sayi">'+fmt(sonraki).slice(0,5)+'</div><p style="text-align:center;font-size:22px">'+Math.floor(kalan/3600)+' sa '+Math.floor(kalan%3600/60)+' dk '+(kalan%60)+' sn kaldı</p>';
}

// ================= yolcuya açık veri (plaka sızmaz) =================
let PLAN_T=null;
function yolcuDurakVerisi(kod,ad,Ay){
 return {ad:ad||Ay.durakAdi||kod,konum:Ay.konum||{lat:null,lng:null},
  hatlar:(Ay.hatlar||[]).map(h=>({id:h.id,ad:h.ad,renk:h.renk||'',duraklar:(h.duraklar||[]).map(d=>d.ad)})),
  kodlar:[...new Set(Object.values(Ay.aracKodlari||{}))],z:Date.now()};
}
async function yolcuDurakYayinla(){
 if(!A||!DURAK||!FS)return;
 try{await dref('yolcuDuraklari/'+DURAK).set(yolcuDurakVerisi(DURAK,A._ad||A.durakAdi,A))}catch(e){}
}
function planVerisi(Ay,tarih,Gun){
 const hatlar={},gun=Gun||{};
 (Ay.hatlar||[]).forEach(h=>{
  const gh=(gun.hatlar||{})[h.id]||{},gt=gh.gunTuru||gun.gunTuru||otoGunTuru(Ay,tarih),mv=gh.mevsim||gun.mevsim||otoMevsim(Ay,tarih);
  hatlar[h.id]={ad:h.ad,renk:h.renk||'',seferler:seferSaatleri(h,gt,mv,gh).map(s=>({s,d:seferDuraklari(h,gt,s,gh).D.map(q=>({ad:q[0],t:s+q[1]*60}))}))};
 });
 return {z:Date.now(),hatlar};
}
async function planYayinla(){if(!A||!DURAK||!FS||ROL==='sofor')return;try{await dref(dp('plan',TARIH)).set(planVerisi(A,TARIH,G))}catch(e){}}
function qrAc(){window.open('yolcu.html?qr=1&durak='+encodeURIComponent(DURAK),'_blank')}

basla();
