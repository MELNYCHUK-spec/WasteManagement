import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Bin } from '../../types/container';
import type { DeviceLocation } from '../../types/location';
import { statusLabel, translate } from '../../i18n';
import type { Language } from '../../i18n';
import 'leaflet/dist/leaflet.css';

function binIcon(status: Bin['status'], selected: boolean) {
  return L.divIcon({
    className: 'bin-marker-shell',
    html: `<span class="leaflet-bin-marker ${status}${selected ? ' selected' : ''}"><span></span></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

function MapViewport({ selectedBin, deviceLocation, routeCoordinates, expanded }: { selectedBin?: Bin; deviceLocation: DeviceLocation | null; routeCoordinates: [number, number][]; expanded: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBin) {
      map.flyTo([selectedBin.latitude, selectedBin.longitude], Math.max(map.getZoom(), 15), { duration: 0.45 });
    } else if (routeCoordinates.length) {
      map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [28, 28], maxZoom: 15 });
    } else if (deviceLocation) {
      map.flyTo([deviceLocation.latitude, deviceLocation.longitude], 15, { duration: 0.45 });
    }
  }, [map, selectedBin?.id, deviceLocation?.latitude, deviceLocation?.longitude, routeCoordinates.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 200);
    return () => window.clearTimeout(timer);
  }, [map, expanded]);

  return null;
}

type ContainerMapProps = {
  bins: Bin[];
  selected: string | null;
  onSelect: (id: string) => void;
  deviceLocation: DeviceLocation | null;
  routeCoordinates: [number, number][];
  language: Language;
  displayBinName: (bin: Bin) => string;
  displayBinAddress: (bin: Bin) => string;
  expanded: boolean;
};

const deviceIcon = L.divIcon({
  className: 'device-marker-shell',
  html: '<span class="device-marker"><span></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function ContainerMap({ bins, selected, onSelect, deviceLocation, routeCoordinates, language, displayBinName, displayBinAddress, expanded }: ContainerMapProps) {
  const selectedBin = bins.find((bin) => bin.id === selected);

  return <div className="map-wrap">
    <MapContainer className="leaflet-map" center={[46.4844, 30.7344]} zoom={13} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport selectedBin={selectedBin} deviceLocation={deviceLocation} routeCoordinates={routeCoordinates} expanded={expanded}/>
      {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates} pathOptions={{ color: '#397f53', weight: 5, opacity: 0.85 }} />}
      {deviceLocation && <>
        <Circle center={[deviceLocation.latitude, deviceLocation.longitude]} radius={deviceLocation.accuracy} pathOptions={{ color: '#397dd1', fillColor: '#397dd1', fillOpacity: 0.1, weight: 1 }}/>
        <Marker position={[deviceLocation.latitude, deviceLocation.longitude]} icon={deviceIcon} zIndexOffset={1000}>
          <Popup>{translate(language, 'locationHere')} · {translate(language, 'accuracyAbout')} {Math.round(deviceLocation.accuracy)} m</Popup>
        </Marker>
      </>}
      {bins.map((bin) => <Marker
        key={bin.id}
        position={[bin.latitude, bin.longitude]}
        icon={binIcon(bin.status, selected === bin.id)}
        eventHandlers={{ click: () => onSelect(bin.id) }}
      >
        <Popup>
          <div className="bin-popup">
            <strong>{displayBinName(bin)}</strong>
            <span>{displayBinAddress(bin)}</span>
            <b className={`popup-fill ${bin.status}`}>{bin.fill_percent}% · {statusLabel(language, bin.status)}</b>
          </div>
        </Popup>
      </Marker>)}
    </MapContainer>
    <div className="map-legend"><span><i className="dot full"/>{translate(language,'collectionNeeded')}</span><span><i className="dot warning"/>{translate(language,'soon')}</span><span><i className="dot normal"/>{translate(language,'normal')}</span></div>
  </div>;
}
