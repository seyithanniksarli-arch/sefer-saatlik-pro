// ayar.js – durak ayarlarının düzeni, sefer hesabı ve yazı <-> ayar çevirileri
// Ayar düzeni (bir durağın bütün kuralları tek nesnede):
// { surum, durakAdi, konumDk,
//   gunTurleri:[{id,ad,gunler:[0-6]}],            0=Pazar
//   mevsimler:[{id,ad,aylar:[1-12]}],              boş liste = yaz/kış tuşu yok
//   hatlar:[{id,ad,renk,kalkis,sonSefer,turSuresi,
//            turler:[{id,ad,son}],                  araç türleri ve son kalkış saatleri, ilk tür varsayılan
//            duraklar:[{ad,dk}],                    kalkıştan kaç dk sonra
//            tarife:{ <gunTuru> veya <gunTuru>_<mevsim> : {sabit:[saat], bantlar:[{bas,bit,aralik}]}},
//            uzatmalar:[{gunTurleri:[id], bas, bit, ek:{durakAdi:dk}}]}],
//   carpi:{tur:'sefer'|'dakika', ucret, tolerans, not} }

const GUN_KISA=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const AY_KISA=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const sn=(h,m,s=0)=>h*3600+m*60+s;
function saatSn(x){if(typeof x=='number')return x;const p=String(x||'').trim().split(/[:.]/).map(Number);if(p.length<2||p.some(isNaN))return NaN;return sn(p[0],p[1],p[2]||0)}
function fmt(x){x=Math.round(x);const h=Math.floor(x/3600),m=Math.floor(x%3600/60),s=x%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+(s?':'+String(s).padStart(2,'0'):'')}
function dkYaz(d){d=Math.round(d*100)/100;return String(d).replace('.',',')}
// plaka = yolcu kodu: yolcuya sadece kod gider
const KOD_YAZ=o=>Object.entries(o||{}).map(([p,k])=>p+' = '+k).join('\n');
function KOD_OKU(t){const o={};String(t||'').split('\n').map(x=>x.trim()).filter(x=>x).forEach(x=>{const m=x.match(/^(.+?)\s*=\s*(.+)$/);if(!m)throw 'Araç kodu satırı anlaşılmadı: '+x;o[m[1].trim().toUpperCase()]=m[2].trim()});return o}
const KOORD_YAZ=o=>Object.entries(o||{}).map(([a,p])=>a+' = '+p.lat+', '+p.lng).join('\n');
function KOORD_OKU(t){const o={};String(t||'').split('\n').map(x=>x.trim()).filter(x=>x).forEach(x=>{const m=x.match(/^(.+?)\s*=\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);if(!m)throw 'Koordinat satırı anlaşılmadı: '+x;o[m[1].trim()]={lat:+m[2],lng:+m[3]}});return o}
const KONUM_YAZ=p=>p&&p.lat!=null?p.lat+', '+p.lng:'';
function KONUM_OKU(t){if(!String(t||'').trim())return {lat:null,lng:null};const m=String(t).trim().match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);if(!m)throw 'Durak konumu "enlem, boylam" biçiminde olmalı.';return {lat:+m[1],lng:+m[2]}}
function kisaId(s){return String(s||'').toLowerCase().replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'').slice(0,12)||('h'+Date.now().toString(36))}

function bosAyar(ad){return {surum:1,durakAdi:ad||'',konumDk:5,aracKodlari:{},konum:{lat:null,lng:null},durakKonumlari:{},
 gunTurleri:[{id:'hi',ad:'Hafta içi',gunler:[1,2,3,4,5]},{id:'hs',ad:'Hafta sonu',gunler:[0,6]}],mevsimler:[],
 hatlar:[{id:'hat1',ad:'1. hat',renk:'#1e63b8',kalkis:'Kalkış',sonSefer:'22:00',turSuresi:60,turler:[{id:'normal',ad:'Normal',son:'22:00'}],duraklar:[],
  tarife:{hi:{sabit:['06:00'],bantlar:[{bas:'06:00',bit:'22:00',aralik:10}]},hs:{sabit:['07:00'],bantlar:[{bas:'07:00',bit:'22:00',aralik:15}]}},uzatmalar:[]}],
 carpi:{tur:'sefer',ucret:0,tolerans:0,not:''}}}

// --- ayar denetimi: yapıştırılan veride eksik/yanlış varsa Türkçe hata listesi döner
function ayarDenetle(A){
 const H=[];if(!A||typeof A!='object')return ['Ayar boş.'];
 if(!Array.isArray(A.gunTurleri)||!A.gunTurleri.length)H.push('En az bir gün türü olmalı.');
 if(!Array.isArray(A.hatlar)||!A.hatlar.length)H.push('En az bir hat olmalı.');
 const gid=new Set((A.gunTurleri||[]).map(g=>g.id));
 (A.hatlar||[]).forEach((h,i)=>{
  const n=(h.ad||(i+1)+'. hat')+': ';
  if(!h.id)H.push(n+'hat kodu yok.');
  if(isNaN(saatSn(h.sonSefer)))H.push(n+'son sefer saati yanlış.');
  if(!Array.isArray(h.turler)||!h.turler.length)H.push(n+'en az bir araç türü olmalı.');
  (h.turler||[]).forEach(t=>{if(isNaN(saatSn(t.son)))H.push(n+t.ad+' son kalkış saati yanlış.')});
  for(const g of gid){if(!h.tarife||!(h.tarife[g]||Object.keys(h.tarife).some(k=>k.startsWith(g+'_'))))H.push(n+(A.gunTurleri.find(x=>x.id==g)||{}).ad+' için sefer saatleri yok.')}
  for(const k in (h.tarife||{})){const T=h.tarife[k];(T.sabit||[]).forEach(s=>{if(isNaN(saatSn(s)))H.push(n+'['+k+'] yanlış saat: '+s)});(T.bantlar||[]).forEach(b=>{if(isNaN(saatSn(b.bas))||isNaN(saatSn(b.bit))||!(b.aralik>0))H.push(n+'['+k+'] yanlış aralık satırı: '+b.bas+'-'+b.bit)})}
 });
 const gor=new Set();Object.values(A.aracKodlari||{}).forEach(k=>{if(gor.has(k))H.push('Yolcu kodu tekrar ediyor: '+k);gor.add(k)});
 return H;
}

// --- gün türü ve mevsim
function otoGunTuru(A,tarih){const g=new Date(tarih+'T12:00').getDay();const x=(A.gunTurleri||[]).find(t=>(t.gunler||[]).includes(g));return x?x.id:(A.gunTurleri[0]||{}).id}
function otoMevsim(A,tarih){if(!A.mevsimler||!A.mevsimler.length)return '';const ay=new Date(tarih+'T12:00').getMonth()+1;const x=A.mevsimler.find(m=>(m.aylar||[]).includes(ay));return x?x.id:A.mevsimler[0].id}
function tarifeBul(h,gt,mv){return (mv&&h.tarife[gt+'_'+mv])||h.tarife[gt]||h.tarife[Object.keys(h.tarife).find(k=>k.startsWith(gt+'_'))]||{sabit:[],bantlar:[]}}

// --- günün aralık değişikliği bantları tarifeye bindirir (günün bandı kazanır)
function bantBirlestir(taban,gunluk){
 const G=(gunluk||[]).map(b=>[saatSn(b.bas),saatSn(b.bit),b.aralik*60]).filter(b=>!isNaN(b[0])&&!isNaN(b[1])&&b[2]>0);
 let L=(taban||[]).map(b=>[saatSn(b.bas),saatSn(b.bit),b.aralik*60]);
 for(const g of G){const Y=[];for(const b of L){if(b[1]<=g[0]||b[0]>=g[1]){Y.push(b);continue}if(b[0]<g[0])Y.push([b[0],g[0],b[2]]);if(b[1]>g[1])Y.push([g[1],b[1],b[2]])}L=Y}
 return L.concat(G).sort((a,b)=>a[0]-b[0]);
}
// --- günün sefer saatleri (saniye)
function seferSaatleri(h,gt,mv,gunHat){
 const T=tarifeBul(h,gt,mv),son=saatSn(h.sonSefer);
 const o=(T.sabit||[]).map(saatSn).filter(x=>!isNaN(x)).sort((a,b)=>a-b);
 let c=o.length?o[o.length-1]:null;
 for(const b of bantBirlestir(T.bantlar,gunHat&&gunHat.bant)){
  if(c===null||c<b[0]-b[2]){c=b[0];if(!o.includes(c))o.push(c)}
  for(;;){const n=c+b[2];if(n>b[1]+0.5)break;o.push(n);c=n}
 }
 return [...new Set(o.map(x=>Math.round(x)))].filter(x=>x<=son).sort((a,b)=>a-b);
}
// --- uzatma: o saatte kalkan seferde durakların planına eklenen dakikalar
function uzatmaEk(h,gt,dep,gunHat){
 const ek={};const L=(h.uzatmalar||[]).filter(u=>!u.gunTurleri||!u.gunTurleri.length||u.gunTurleri.includes(gt)).concat((gunHat&&gunHat.uzat)||[]);
 for(const u of L){const b=saatSn(u.bas),s=saatSn(u.bit);if(dep<b||dep>=s)continue;
  let tas=0;(h.duraklar.length?h.duraklar:[{ad:'_tur'}]).forEach(d=>{if(u.ek&&u.ek[d.ad]!==undefined)tas=+u.ek[d.ad]||0;ek[d.ad]=(ek[d.ad]||0)+tas});
  ek._tur=(ek._tur||0)+(u.ek&&u.ek._tur!==undefined?+u.ek._tur:tas)}
 return ek;
}
// --- o seferin durak saatleri [ad, dk] ve tur süresi (dk)
function seferDuraklari(h,gt,dep,gunHat){
 const ek=uzatmaEk(h,gt,dep,gunHat);
 const D=(h.duraklar||[]).map(d=>[d.ad,(+d.dk||0)+(ek[d.ad]||0)]);
 const tur=D.length?Math.max(D[D.length-1][1],(+h.turSuresi||0)+(ek._tur||0)):(+h.turSuresi||0)+(ek._tur||0);
 if(!D.length||D[D.length-1][1]<tur)D.push([h.kalkis?h.kalkis+' (dönüş)':'Tur sonu',tur]);
 return {D,tur};
}
// --- sıraya göre araç dağıtımı: araç sırayla döner, türünün son kalkış saatini geçen araç sıradan çıkar
function planHesapla(h,gt,mv,gunHat){
 const G=gunHat||{};const tur=G.tur||{},ariza=G.ariza||{};
 const tipler=h.turler||[];const varsay=(tipler[0]||{}).id;
 const sinir={};tipler.forEach(t=>sinir[t.id]=saatSn(t.son));
 const plakalar=String(G.plakalar||'').split(/[\s,;]+/).filter(x=>x);
 const canli=plakalar.filter(p=>!ariza[p]).map(p=>({p,k:sinir[tur[p]]!==undefined?tur[p]:varsay}));
 const sf=seferSaatleri(h,gt,mv,G);
 const satir=[],PLAN={},sonC={},say={};let idx=0;
 for(const s of sf){
  let sec=null;
  for(let j=0;j<canli.length;j++){const c=canli[(idx+j)%canli.length];if(s<=sinir[c.k]){sec=c;idx=(idx+j+1)%canli.length;break}}
  if(!sec){satir.push({s,p:null});continue}
  const p=sec.p;say[p]=(say[p]||0)+1;let gec=0;
  if(sonC[p]!==undefined){const donus=sonC[p]+seferDuraklari(h,gt,sonC[p],G).tur*60;if(donus>s)gec=Math.ceil((donus-s)/60)}
  sonC[p]=s;(PLAN[p]=PLAN[p]||[]).push(s);satir.push({s,p,n:say[p],gec});
 }
 return {satir,PLAN,canli,sonC,say};
}

// --- ayar -> yazı (düzenleme kutuları için) ve yazı -> ayar
const GT_YAZ=A=>(A.gunTurleri||[]).map(g=>g.id+' = '+g.ad+': '+(g.gunler||[]).map(x=>GUN_KISA[x]).join(' ')).join('\n');
function GT_OKU(t){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{const m=x.match(/^([^=]+)=([^:]+):?(.*)$/);if(!m)throw 'Gün türü satırı anlaşılmadı: '+x;
 const gun=m[3].split(/[\s,]+/).filter(y=>y).map(y=>GUN_KISA.findIndex(k=>k.toLowerCase()==y.toLowerCase().slice(0,3).replace('pts','pzt')));if(gun.includes(-1))throw 'Gün adı anlaşılmadı: '+x;return {id:m[1].trim(),ad:m[2].trim(),gunler:gun}})}
const MV_YAZ=A=>(A.mevsimler||[]).map(m=>m.id+' = '+m.ad+': '+(m.aylar||[]).map(x=>AY_KISA[x-1]).join(' ')).join('\n');
function MV_OKU(t){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{const m=x.match(/^([^=]+)=([^:]+):?(.*)$/);if(!m)throw 'Mevsim satırı anlaşılmadı: '+x;
 const ay=m[3].split(/[\s,]+/).filter(y=>y).map(y=>AY_KISA.findIndex(k=>k.toLowerCase()==y.toLowerCase().slice(0,3))+1);if(ay.includes(0))throw 'Ay adı anlaşılmadı: '+x;return {id:m[1].trim(),ad:m[2].trim(),aylar:ay}})}
const TUR_YAZ=h=>(h.turler||[]).map(t=>t.id+' = '+t.ad+': '+t.son).join('\n');
function TUR_OKU(t){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{const m=x.match(/^([^=]+)=([^:]+):\s*([\d:.]+)$/);if(!m)throw 'Araç türü satırı anlaşılmadı: '+x;return {id:m[1].trim(),ad:m[2].trim(),son:m[3].trim()}})}
const DUR_YAZ=h=>(h.duraklar||[]).map(d=>d.ad+': '+dkYaz(d.dk)).join('\n');
function DUR_OKU(t){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{const m=x.match(/^(.+):\s*([\d.,]+)$/);if(!m)throw 'Durak satırı anlaşılmadı: '+x;return {ad:m[1].trim(),dk:+m[2].replace(',','.')}})}
function TAR_YAZ(h){return Object.keys(h.tarife||{}).map(k=>{const T=h.tarife[k];return '['+k+']\nsabit: '+(T.sabit||[]).join(' ')+'\n'+(T.bantlar||[]).map(b=>b.bas+'-'+b.bit+' '+dkYaz(b.aralik)).join('\n')}).join('\n\n')}
function TAR_OKU(t){const R={};let k=null;t.split('\n').map(x=>x.trim()).filter(x=>x).forEach(x=>{
 let m=x.match(/^\[(.+)\]$/);if(m){k=m[1].trim();R[k]={sabit:[],bantlar:[]};return}
 if(!k)throw 'Saatlerden önce gün türünü [hi] gibi yaz.';
 m=x.match(/^sabit:?\s*(.*)$/i);if(m){R[k].sabit=m[1].split(/[\s,]+/).filter(y=>y);R[k].sabit.forEach(s=>{if(isNaN(saatSn(s)))throw 'Yanlış saat: '+s});return}
 m=x.match(/^([\d:.]+)\s*-\s*([\d:.]+)\s+([\d.,]+)/);if(m){R[k].bantlar.push({bas:m[1],bit:m[2],aralik:+m[3].replace(',','.')});return}
 throw 'Saat satırı anlaşılmadı: '+x});return R}
const BANT_YAZ=L=>(L||[]).map(b=>b.bas+'-'+b.bit+' '+dkYaz(b.aralik)).join('\n');
function BANT_OKU(t){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{const m=x.match(/^([\d:.]+)\s*-\s*([\d:.]+)\s+([\d.,]+)/);if(!m)throw 'Aralık satırı anlaşılmadı: '+x+' (örnek: 08:30-16:30 7)';return {bas:m[1],bit:m[2],aralik:+m[3].replace(',','.')}})}
const UZ_YAZ=(L,gtli)=>(L||[]).map(u=>(gtli?((u.gunTurleri||[]).join(',')||'hepsi')+' ':'')+u.bas+'-'+u.bit+' '+Object.entries(u.ek||{}).map(([a,d])=>a+'='+dkYaz(d)).join(', ')).join('\n');
function UZ_OKU(t,gtli){return t.split('\n').map(x=>x.trim()).filter(x=>x).map(x=>{let gt=[];if(gtli){const i=x.indexOf(' ');gt=x.slice(0,i)=='hepsi'?[]:x.slice(0,i).split(',');x=x.slice(i+1).trim()}
 const m=x.match(/^([\d:.]+)\s*-\s*([\d:.]+)\s+(.+)$/);if(!m)throw 'Uzatma satırı anlaşılmadı: '+x;const ek={};
 m[3].split(',').map(y=>y.trim()).filter(y=>y).forEach(y=>{const q=y.match(/^(.+?)\s*[=+]\s*([\d.,]+)$/);if(!q)throw 'Uzatma durağı anlaşılmadı: '+y+' (örnek: Metrobüs=2)';ek[q[1].trim()]=+q[2].replace(',','.')});
 const r={bas:m[1],bit:m[2],ek};if(gtli)r.gunTurleri=gt;return r})}
