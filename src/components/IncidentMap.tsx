import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Incident, IncidentStatus } from '../types';
import { translations, Language } from '../lib/translations';
import { AlertTriangle, Car, Filter, MapPin, FileText } from 'lucide-react';

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

interface IncidentMapProps {
  incidents: Incident[];
  lang: Language;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export function IncidentMap({ incidents, lang }: IncidentMapProps) {
  const t = translations[lang];
  const [typeFilter, setTypeFilter] = useState<'All' | 'Crime' | 'Traffic'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | IncidentStatus>('All');
  
  const filteredIncidents = incidents.filter(incident => {
    const matchesType = typeFilter === 'All' || incident.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || incident.status === statusFilter;
    const hasCoordinates = incident.lat !== undefined && incident.lng !== undefined;
    return matchesType && matchesStatus && hasCoordinates;
  });

  const center: [number, number] = [10.70, 37.26]; // Finote Selam center

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-accent/10 rounded-lg">
            <MapPin className="text-brand-accent" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.incidentMap}</h2>
            <p className="text-sm text-brand-text-secondary">{t.distributionDesc}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-brand-bg/50 px-3 py-2 rounded-xl border border-brand-border">
            <Filter size={16} className="text-brand-accent" />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-brand-card">{t.allTypes}</option>
              <option value="Crime" className="bg-brand-card">{t.crime || 'Crime'}</option>
              <option value="Traffic" className="bg-brand-card">{lang === 'am' ? 'ትራፊክ' : 'Traffic'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-brand-bg/50 px-3 py-2 rounded-xl border border-brand-border">
            <Filter size={16} className="text-brand-accent" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-brand-card">{t.allStatuses}</option>
              {Object.entries(t.incidentStatuses).map(([key, label]) => (
                <option key={key} value={key} className="bg-brand-card">{label as string}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-brand-accent text-brand-bg rounded-xl font-bold text-xs">
            <span>{filteredIncidents.length} {t.incidentsFound}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] glass-card overflow-hidden relative z-0">
        <MapContainer 
          center={center} 
          zoom={10} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredIncidents.map(incident => (
            <Marker 
              key={incident.id} 
              position={[incident.lat!, incident.lng!]}
              icon={incident.type === 'Crime' ? crimeIcon : trafficIcon}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    {incident.type === 'Crime' ? <AlertTriangle size={16} className="text-rose-500" /> : <Car size={16} className="text-blue-500" />}
                    <span className="font-bold text-sm">{incident.title}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p><strong>{lang === 'am' ? 'ሁኔታ' : 'Status'}:</strong> {(t.incidentStatuses as any)[incident.status] || incident.status}</p>
                    <p><strong>{lang === 'am' ? 'ቀን' : 'Date'}:</strong> {incident.date}</p>
                    <p><strong>{lang === 'am' ? 'ቦታ' : 'Location'}:</strong> {incident.location}</p>
                    <p className="mt-2 text-brand-text-secondary line-clamp-2 italic">{incident.description}</p>
                    
                    {(incident.photos || []).length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        {incident.photos?.map((photo, idx) => (
                          <div key={idx} className="aspect-square rounded border border-brand-border overflow-hidden">
                            <img src={photo} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(photo, '_blank')} />
                          </div>
                        ))}
                      </div>
                    )}

                    {incident.voice_url && (
                      <div className="mt-3 pt-2 border-t border-brand-border/20">
                        <audio src={incident.voice_url} controls className="w-full h-8" />
                      </div>
                    )}
                    {(incident.documents || []).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-brand-border/20 space-y-1">
                        <p className="font-bold text-[10px] uppercase text-brand-text-secondary">Documents</p>
                        {incident.documents?.map((doc, idx) => (
                          <a 
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-brand-accent hover:underline text-[10px]"
                          >
                            <FileText size={12} />
                            <span className="truncate max-w-[150px]">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-6 p-4 glass-card justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-xs font-bold">{t.crime || 'Crime'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs font-bold">{lang === 'am' ? 'ትራፊክ' : 'Traffic'}</span>
        </div>
      </div>
    </div>
  );
}
