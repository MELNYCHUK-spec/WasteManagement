import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock3, Container, Expand, Leaf, LocateFixed, Minimize2, Navigation, Search, Truck } from 'lucide-react';
import ContainerMap from './features/map/ContainerMap';
import type { Bin } from './types/container';
import type { DeviceLocation } from './types/location';
import { statusLabel } from './i18n';
import type { Language, MessageKey } from './i18n';
import { translate } from './i18n';

type Stats = { total: number; full: number; warning: number; average: number; online: number };
const initialStats: Stats = { total: 0, full: 0, warning: 0, average: 0, online: 0 };
const demoBins: Bin[] = [
  {id:'CNT-001',name:'Контейнер 01',address:'вул. Дерибасівська · демо-точка',latitude:46.4844,longitude:30.7344,capacity_kg:120,fill_percent:92,status:'full',waste_type:'mixed',last_update:new Date().toISOString()},
  {id:'CNT-002',name:'Контейнер 02',address:'Приморський бульвар · демо-точка',latitude:46.4886,longitude:30.7419,capacity_kg:100,fill_percent:78,status:'warning',waste_type:'plastic',last_update:new Date().toISOString()},
  {id:'CNT-003',name:'Контейнер 03',address:'вул. Преображенська · демо-точка',latitude:46.4782,longitude:30.7320,capacity_kg:120,fill_percent:64,status:'normal',waste_type:'mixed',last_update:new Date().toISOString()},
  {id:'CNT-004',name:'Контейнер 04',address:'вул. Михайла Грушевського · демо-точка',latitude:46.4742,longitude:30.7144,capacity_kg:100,fill_percent:38,status:'normal',waste_type:'paper',last_update:new Date().toISOString()},
  {id:'CNT-005',name:'Контейнер 05',address:'Аркадійська алея · демо-точка',latitude:46.4304,longitude:30.7620,capacity_kg:150,fill_percent:87,status:'full',waste_type:'mixed',last_update:new Date().toISOString()},
  {id:'CNT-006',name:'Контейнер 06',address:'Французький бульвар · демо-точка',latitude:46.4440,longitude:30.7580,capacity_kg:100,fill_percent:52,status:'normal',waste_type:'glass',last_update:new Date().toISOString()},
  {id:'CNT-007',name:'Контейнер 07',address:'Миколаївська дорога · демо-точка',latitude:46.5160,longitude:30.7280,capacity_kg:120,fill_percent:71,status:'warning',waste_type:'mixed',last_update:new Date().toISOString()},
  {id:'CNT-008',name:'Контейнер 08',address:'вул. Пантелеймонівська · демо-точка',latitude:46.4686,longitude:30.7408,capacity_kg:100,fill_percent:24,status:'normal',waste_type:'plastic',last_update:new Date().toISOString()},
  {id:'CNT-009',name:'Контейнер 09',address:'вул. Космонавтів · демо-точка',latitude:46.4355,longitude:30.7110,capacity_kg:120,fill_percent:58,status:'normal',waste_type:'paper',last_update:new Date().toISOString()},
  {id:'CNT-010',name:'Контейнер 10',address:'вул. Академіка Корольова · демо-точка',latitude:46.4055,longitude:30.7215,capacity_kg:120,fill_percent:76,status:'warning',waste_type:'glass',last_update:new Date().toISOString()},
];
const demoAddresses: Record<Language, Record<string, string>> = {
  uk: {'CNT-001':'вул. Дерибасівська · демо-точка','CNT-002':'Приморський бульвар · демо-точка','CNT-003':'вул. Преображенська · демо-точка','CNT-004':'вул. Михайла Грушевського · демо-точка','CNT-005':'Аркадійська алея · демо-точка','CNT-006':'Французький бульвар · демо-точка','CNT-007':'Миколаївська дорога · демо-точка','CNT-008':'вул. Пантелеймонівська · демо-точка','CNT-009':'вул. Космонавтів · демо-точка','CNT-010':'вул. Академіка Корольова · демо-точка'},
  en: {'CNT-001':'Derybasivska Street · demo location','CNT-002':'Primorskyi Boulevard · demo location','CNT-003':'Preobrazhenska Street · demo location','CNT-004':'Mykhaila Hrushevskoho Street · demo location','CNT-005':'Arkadiyska Alley · demo location','CNT-006':'French Boulevard · demo location','CNT-007':'Mykolaivska Road · demo location','CNT-008':'Panteleimonivska Street · demo location','CNT-009':'Kosmonavtiv Street · demo location','CNT-010':'Akademika Korolyova Street · demo location'},
};
const distanceKm = (a: Pick<DeviceLocation,'latitude'|'longitude'>, b: Pick<Bin,'latitude'|'longitude'>) => {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export default function App() {
  const [language,setLanguage]=useState<Language>(()=>localStorage.getItem('ecoroute-language')==='en'?'en':'uk');
  const t=(key:MessageKey)=>translate(language,key);
  const [bins,setBins] = useState<Bin[]>([]); const [stats,setStats]=useState(initialStats);
  const [selected,setSelected]=useState<string|null>(null); const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all'); const [time,setTime]=useState(new Date());
  const [deviceLocation,setDeviceLocation]=useState<DeviceLocation|null>(null);
  const [locationStatus,setLocationStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [locationError,setLocationError]=useState<MessageKey|null>(null);
  const [mapExpanded,setMapExpanded]=useState(false);
  const [routeCoordinates,setRouteCoordinates]=useState<[number,number][]>([]);
  const [routeMetrics,setRouteMetrics]=useState<{distanceKm:number;durationMinutes:number}|null>(null);
  const [routeStatus,setRouteStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [plannedStops,setPlannedStops]=useState<Bin[]>([]);
  const [plannedOrigin,setPlannedOrigin]=useState<DeviceLocation|null>(null);
  const [routeMessage,setRouteMessage]=useState<MessageKey|null>(null);
  const locationRequested=useRef(false);
  const displayBinName=(bin:Bin)=>{const number=bin.name.match(/^(?:Контейнер|Container)\s*(\d+)$/i)?.[1]??bin.id.match(/^CNT-(\d+)$/)?.[1];return number?`${t('container')} ${number.slice(-2)}`:bin.name;};
  const displayBinAddress=(bin:Bin)=>demoAddresses[language][bin.id]||bin.address;

  useEffect(()=>{localStorage.setItem('ecoroute-language',language);document.documentElement.lang=language;},[language]);

  const requestLocation=() => {
    if (!window.isSecureContext) {
      setLocationStatus('error');
      setLocationError('secureLocation');
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('noGeolocation');
      return;
    }
    setLocationStatus('loading');
    setLocationError(null);
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setDeviceLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
          setLocationStatus('ready');
          setSelected(null);
        },
        (error) => {
          setLocationStatus('error');
          const messages: Record<number, MessageKey> = {1:'permissionDenied',2:'positionUnavailable',3:'locationTimeout'};
          setLocationError(messages[error.code] || 'locationFailed');
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
      );
    } catch {
      setLocationStatus('error');
      setLocationError('locationBlocked');
    }
  };

  useEffect(() => {
    if (locationRequested.current) return;
    locationRequested.current = true;
    requestLocation();
  }, []);

  useEffect(()=>{const refresh=async()=>{try{const [b,s]=await Promise.all([fetch('/api/containers'),fetch('/api/stats')]); if(!b.ok||!s.ok)throw new Error(); setBins(await b.json());setStats(await s.json());}catch{setBins(current=>current.length?current:demoBins);setStats(current=>current.total?current:{total:demoBins.length,full:2,warning:3,average:64,online:10});}}; void refresh(); const timer=setInterval(()=>{void refresh();setTime(new Date());},15000);return()=>clearInterval(timer)},[]);
  const visibleBins=useMemo(()=>bins.filter(b=>(filter==='all'||b.status===filter)&&`${b.name} ${b.address} ${b.id}`.toLowerCase().includes(query.toLowerCase())),[bins,filter,query]);
  const selectedBin=bins.find(b=>b.id===selected);
  const routeCandidates=useMemo(()=>bins.filter(b=>b.status==='full'),[bins]);
  const nearbyRouteCandidates=useMemo(()=>deviceLocation?routeCandidates.filter(bin=>distanceKm(deviceLocation,bin)<=75):[],[deviceLocation,routeCandidates]);
  const routeStops=useMemo(()=>{
    if(!deviceLocation)return [];
    return [...nearbyRouteCandidates].sort((a,b)=>
      b.fill_percent-a.fill_percent || distanceKm(deviceLocation,a)-distanceKm(deviceLocation,b)
    );
  },[deviceLocation,nearbyRouteCandidates]);
  const farFromDevice=Boolean(deviceLocation&&routeCandidates.length>0&&nearbyRouteCandidates.length===0);
  const locationLabel=locationStatus==='loading'?t('gettingLocation'):locationStatus==='ready'&&deviceLocation?`${deviceLocation.latitude.toFixed(4)}, ${deviceLocation.longitude.toFixed(4)}`:t('locationUnavailable');
  const buildRoute=async()=>{
    setPlannedStops([]);setPlannedOrigin(null);setRouteCoordinates([]);setRouteMetrics(null);
    if(!deviceLocation){setRouteStatus('idle');setRouteMessage('getLocationAgain');requestLocation();return;}
    if(farFromDevice){setRouteMessage('noNearby');setRouteStatus('error');return;}
    const stops=[...routeStops];
    if(!stops.length){setPlannedStops([]);setPlannedOrigin(deviceLocation);setRouteCoordinates([]);setRouteMetrics(null);setRouteMessage('noBins');setRouteStatus('ready');return;}
    setPlannedStops(stops);setPlannedOrigin(deviceLocation);setRouteMessage(null);setRouteMetrics(null);setRouteStatus('loading');
    const waypoints=[deviceLocation,...stops].map(point=>`${point.longitude},${point.latitude}`).join(';');
    try{
      const response=await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`);
      if(!response.ok)throw new Error('routing-service');
      const data=await response.json();const route=data.routes?.[0];
      if(data.code!=='Ok'||!route)throw new Error('no-road-route');
      setRouteCoordinates(route.geometry.coordinates.map(([longitude,latitude]:[number,number])=>[latitude,longitude] as [number,number]));
      setRouteMetrics({distanceKm:route.distance/1000,durationMinutes:Math.round(route.duration/60)});setRouteStatus('ready');
    }catch(error){
      setRouteCoordinates([[deviceLocation.latitude,deviceLocation.longitude],...stops.map(bin=>[bin.latitude,bin.longitude] as [number,number])]);
      setRouteMessage(error instanceof Error&&error.message==='no-road-route'?'noRoadRoute':'routeServiceError');setRouteStatus('error');
    }
  };
  return <div className="app-shell">
    <main className="main-content">
      <header className="topbar"><div className="brand-wordmark"><span>eco</span>route <small>SMART WASTE SYSTEM</small></div><div className="top-actions"><span className="live-status"><i/> {t('live')}</span><div className="language-switch" aria-label={t('language')}><button className={language==='uk'?'active':''} onClick={()=>setLanguage('uk')} aria-pressed={language==='uk'}>UA</button><button className={language==='en'?'active':''} onClick={()=>setLanguage('en')} aria-pressed={language==='en'}>EN</button></div><span className="top-date"><Clock3 size={15}/>{time.toLocaleTimeString(language==='uk'?'uk-UA':'en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div></header>
      <section className="page-heading"><div><div className="eyebrow">{time.toLocaleDateString(language==='uk'?'uk-UA':'en-GB',{weekday:'long',day:'numeric',month:'long'}).toLocaleUpperCase(language==='uk'?'uk-UA':'en-GB')}</div><h1>{t('appTitle')}</h1><p>{t('appSubtitle')}</p></div></section>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-top"><span>{t('total')}</span><span className="stat-icon green"><Container size={17}/></span></div><div className="stat-value">{stats.total}<small> {t('units')}</small></div><div className="stat-foot"><span className="positive">●</span> {t('allMapPoints')}</div></article>
        <article className="stat-card"><div className="stat-top"><span>{t('needsCollection')}</span><span className="stat-icon red"><Truck size={17}/></span></div><div className="stat-value">{stats.full}<small> {t('containers')}</small></div><div className="stat-foot"><span className="red-text">● {t('priority')}</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>{t('fillingSoon')}</span><span className="stat-icon amber"><Activity size={17}/></span></div><div className="stat-value">{stats.warning}<small> {t('containers')}</small></div><div className="stat-foot"><span className="amber-text">● {t('above70')}</span></div></article>
        <article className="stat-card"><div className="stat-top"><span>{t('averageFill')}</span><span className="stat-icon blue"><Activity size={17}/></span></div><div className="stat-value">{stats.average}<small>%</small></div><div className="stat-foot">{t('allContainers')}</div></article>
      </section>
      <section className="content-grid" id="overview">
        <article className={`panel map-panel${mapExpanded?' expanded':''}`}><div className="panel-heading"><div><h2>{t('containerMap')}</h2><p><span className="live-dot"/> {t('updated')} {time.toLocaleTimeString(language==='uk'?'uk-UA':'en-GB',{hour:'2-digit',minute:'2-digit'})}</p></div><div className="map-heading-actions"><button className="select-btn location-button" onClick={requestLocation} disabled={locationStatus==='loading'}><LocateFixed size={14}/>{locationStatus==='loading'?t('locating'):t('myLocation')}</button><button className="map-size-button" onClick={()=>setMapExpanded(value=>!value)} aria-label={t(mapExpanded?'shrinkMap':'expandMap')} title={t(mapExpanded?'shrinkMap':'expandMap')}>{mapExpanded?<Minimize2 size={16}/>:<Expand size={16}/>}</button></div></div><ContainerMap bins={visibleBins} selected={selected} onSelect={setSelected} deviceLocation={deviceLocation} routeCoordinates={routeCoordinates} language={language} displayBinName={displayBinName} displayBinAddress={displayBinAddress} expanded={mapExpanded}/>{locationError&&<div className="map-notice error-notice">{t(locationError)}</div>}{farFromDevice&&<div className="map-notice">{t('demoFar')}</div>}</article>
        <article className="panel list-panel" id="containers"><div className="panel-heading"><div><h2>{t('binsStatus')}</h2><p>{visibleBins.length} {t('inZone')}</p></div><button className="more-btn" aria-hidden="true">•••</button></div><div className="list-toolbar"><label><Search size={15}/><input placeholder={t('search')} value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t('allStatuses')}</option><option value="full">{t('full')}</option><option value="warning">{t('warning')}</option><option value="normal">{t('normal')}</option></select></div><div className="bin-list">{visibleBins.map(b=><button className={`bin-row ${selected===b.id?'selected':''}`} key={b.id} onClick={()=>setSelected(b.id)}><span className={`bin-symbol ${b.status}`}><Container size={17}/></span><span className="bin-main"><b>{displayBinName(b)}</b><small>{displayBinAddress(b)}</small></span><span className="bin-fill"><b className={b.status==='full'?'red-text':b.status==='warning'?'amber-text':''}>{b.fill_percent}%</b><i><em className={b.status} style={{width:`${b.fill_percent}%`}}/></i></span><span className={`status-pill ${b.status}`}>{statusLabel(language,b.status)}</span></button>)}</div><button className="all-bins" onClick={()=>{setFilter('all');setQuery('')}}>{t('showAll')} <span>→</span></button></article>
      </section>
      <section className="bottom-grid">
        <article className="panel route-panel" id="routes">
          <div className="panel-heading"><div><h2>{t('routeTitle')}</h2><p>{t('routeSubtitle')}</p></div><span className="route-status">{routeStatus==='idle'?'—':`${routeStatus==='loading'?routeStops.length:plannedStops.length} ${t('points')}`}</span></div>
          <div className="route-summary"><span className="route-icon"><Navigation size={19}/></span><div><b>{locationStatus==='ready'?t('currentLocation'):t('waitingLocation')}</b><small>{locationLabel}</small></div></div>
          {routeStatus!=='idle'&&plannedStops.length>0&&<div className="route-metrics"><div><b>{routeStatus==='loading'?'…':routeMetrics?`${routeMetrics.distanceKm.toFixed(1)} km`:'—'}</b><span>{t('roadDistance')}</span></div><div><b>{routeStatus==='loading'?'…':routeMetrics?`${routeMetrics.durationMinutes} min`:'—'}</b><span>{t('travelTime')}</span></div><div><b>{plannedStops.length}</b><span>{t('stops')}</span></div></div>}
          {routeStatus!=='idle'&&plannedStops.length>0&&<div className="route-stops">{plannedStops.slice(0,6).map((bin,index)=><div key={bin.id}><i className={`stop-dot ${bin.status==='full'?'red-stop':'amber-stop'}`}/><span><b>{index+1}. {displayBinName(bin)}</b><small>{displayBinAddress(bin)}</small></span><strong>{bin.fill_percent}%</strong></div>)}</div>}
          {routeMessage&&<div className="route-message">{t(routeMessage)}{routeStatus==='error'&&plannedStops.length>0?` ${t('routeFallback')}`:''}</div>}
          {routeStatus==='idle'&&<div className="route-message">{routeMessage?t(routeMessage):t('noRouteYet')}</div>}
          <div className="route-actions">
            <button className="route-button build-route-button" onClick={buildRoute} disabled={routeStatus==='loading'}><Navigation size={15}/>{routeStatus==='loading'?t('buildingRoute'):t('buildRoute')}</button>
            {(routeStatus==='ready'||routeStatus==='error')&&plannedStops.length>0&&plannedOrigin&&<a className="route-button maps-link" href={`https://www.google.com/maps/dir/?api=1&origin=${plannedOrigin.latitude},${plannedOrigin.longitude}&destination=${plannedStops[plannedStops.length-1].latitude},${plannedStops[plannedStops.length-1].longitude}&waypoints=${plannedStops.slice(0,-1).map(bin=>`${bin.latitude},${bin.longitude}`).join('|')}&travelmode=driving`} target="_blank" rel="noreferrer"><Navigation size={15}/>{t('openGoogleMaps')}</a>}
          </div>
        </article>
      </section>
      <footer className="footer"><span><span className="footer-leaf"><Leaf size={13}/></span> EcoRoute <i/> {t('systemFooter')}</span><span><span className="online-dot"/> {t('gatewayOnline')} <b>·</b> API v1.0</span></footer>
    </main>
    {selectedBin&&<div className="toast"><div className={`bin-symbol ${selectedBin.status}`}><Container size={16}/></div><span><b>{displayBinName(selectedBin)}</b><small>{displayBinAddress(selectedBin)} · {selectedBin.fill_percent}%</small></span><button onClick={()=>setSelected(null)} aria-label={t('close')}>×</button></div>}
  </div>;
}
