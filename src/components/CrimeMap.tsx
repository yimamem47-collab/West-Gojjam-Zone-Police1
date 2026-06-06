import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icon issues in React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons for different incident types
const crimeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const trafficIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface CrimeMapProps {
  incidents: any[];
  center?: [number, number];
  zoom?: number;
}

export const CrimeMap: React.FC<CrimeMapProps> = ({ incidents, center = [10.70, 37.26], zoom = 10 }) => {
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-brand-border shadow-inner relative z-0">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {incidents.filter(i => i.lat && i.lng).map((incident) => (
          <Marker 
            key={incident.id} 
            position={[incident.lat, incident.lng]}
            icon={incident.type === 'Crime' ? crimeIcon : trafficIcon}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-brand-bg text-sm">{incident.title}</h3>
                <p className="text-[10px] text-brand-bg/80">{incident.location}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${incident.type === 'Crime' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                    {incident.type}
                  </span>
                  <span className="text-[10px] font-bold text-brand-bg opacity-40">{incident.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
