import { Incident, Officer, Assignment, Report } from './types';

export const INITIAL_OFFICERS: Officer[] = [
  { id: '1', name: 'Assistant Commissioner Derese G.', badgeNumber: 'WG-000', rank: 'assistantCommissioner', email: 'derese.g@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0911000000', status: 'Active' },
  { id: '2', name: 'Commander Abebe Bikila', badgeNumber: 'WG-001', rank: 'commander', email: 'abebe.b@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0911223344', status: 'Active' },
  { id: '3', name: 'Deputy Commander Mulugeta Tesfaye', badgeNumber: 'WG-002', rank: 'deputyCommander', email: 'mulugeta.t@wgpolice.gov.et', station: 'ቡሬ ከተማ', phone: '0922334455', status: 'Active' },
  { id: '4', name: 'Chief Inspector Tadesse Gebre', badgeNumber: 'WG-003', rank: 'chiefInspector', email: 'tadesse.g@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0933445566', status: 'Active' },
  { id: '5', name: 'Inspector Kebede Ayalew', badgeNumber: 'WG-004', rank: 'inspector', email: 'kebede.a@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0944556677', status: 'Active' },
  { id: '6', name: 'Deputy Inspector Almaz Wolde', badgeNumber: 'WG-005', rank: 'deputyInspector', email: 'almaz.w@wgpolice.gov.et', station: 'ቡሬ ከተማ', phone: '0955667788', status: 'Active' },
  { id: '7', name: 'Assistant Inspector Hana T.', badgeNumber: 'WG-006', rank: 'assistantInspector', email: 'hana.t@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0966000000', status: 'Active' },
  { id: '8', name: 'Shambel Basha Girma K.', badgeNumber: 'WG-007', rank: 'shambelBasha', email: 'girma.k@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0977000000', status: 'Active' },
  { id: '9', name: 'Basha Teklu M.', badgeNumber: 'WG-008', rank: 'basha', email: 'teklu.m@wgpolice.gov.et', station: 'ቡሬ ከተማ', phone: '0988000000', status: 'Active' },
  { id: '10', name: 'Chief Sergeant Mengesha Yimam', badgeNumber: 'WG-009', rank: 'chiefSergeant', email: 'mengesha.y@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0966778899', status: 'Active' },
  { id: '11', name: 'Sergeant Aster Molla', badgeNumber: 'WG-010', rank: 'sergeant', email: 'aster.m@wgpolice.gov.et', station: 'ቡሬ ከተማ', phone: '0988990011', status: 'Active' },
  { id: '12', name: 'Deputy Sergeant Belayneh K.', badgeNumber: 'WG-011', rank: 'deputySergeant', email: 'belayneh.k@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0977889900', status: 'Active' },
  { id: '13', name: 'Constable Solomon Tekle', badgeNumber: 'WG-012', rank: 'constable', email: 'solomon.t@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0999001122', status: 'Active' },
];

export const INITIAL_INCIDENTS: Incident[] = [
  { id: '1', title: 'Traffic Accident - Finote Selam', status: 'Open', date: '2024-05-15', location: 'Main Highway', lat: 10.70, lng: 37.26, officerId: '2', filingStation: 'ፍኖተ ሰላም ከተማ', recordingOfficerName: 'Abebe Bikila', recordingOfficerRank: 'commander', type: 'Traffic', category: 'vehicleCollision' },
  { id: '2', title: 'Theft Report - Market Area', status: 'In Progress', date: '2024-05-18', location: 'Central Market', lat: 10.70, lng: 37.06, officerId: '5', filingStation: 'ቡሬ ከተማ', recordingOfficerName: 'Kebede Ayalew', recordingOfficerRank: 'inspector', type: 'Crime', category: 'burglary' },
  { id: '3', title: 'Public Disturbance', status: 'Closed', date: '2024-05-10', location: 'Stadium Area', lat: 10.71, lng: 37.07, officerId: '11', filingStation: 'ቡሬ ከተማ', recordingOfficerName: 'Aster Molla', recordingOfficerRank: 'sergeant', type: 'Crime', category: 'other' },
  { id: '4', title: 'Illegal Arms Trafficking', status: 'Open', date: '2024-05-20', location: 'Border Checkpoint', lat: 10.68, lng: 37.28, officerId: '1', filingStation: 'ፍኖተ ሰላም ከተማ', recordingOfficerName: 'Derese G.', recordingOfficerRank: 'assistantCommissioner', type: 'Crime', category: 'illegalArms' },
  { id: '5', title: 'Minor Traffic Collision', status: 'Closed', date: '2024-05-22', location: 'City Center', lat: 10.55, lng: 37.48, officerId: '13', filingStation: 'ደምበጫ ከተማ', recordingOfficerName: 'Solomon Tekle', recordingOfficerRank: 'constable', type: 'Traffic', category: 'minorInjury' },
  { id: '6', title: 'Fraud Investigation', status: 'In Progress', date: '2024-05-25', location: 'Bank District', lat: 10.56, lng: 37.49, officerId: '7', filingStation: 'ደምበጫ ከተማ', recordingOfficerName: 'Hana T.', recordingOfficerRank: 'assistantInspector', type: 'Crime', category: 'fraud' },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'Interview Witnesses', description: 'Interview all witnesses at the scene.', status: 'Completed', dueDate: '2024-05-16', incidentId: '1', officerId: '1' },
  { id: '2', title: 'Review CCTV Footage', description: 'Review footage from the market cameras.', status: 'Pending', dueDate: '2024-05-20', incidentId: '2', officerId: '2' },
  { id: '3', title: 'Patrol High-Risk Areas', description: 'Regular patrol in the stadium area.', status: 'Pending', dueDate: '2024-05-22', incidentId: '1', officerId: '3' },
];

export const INITIAL_REPORTS: Report[] = [
  { id: '1', title: 'Monthly Crime Statistics', status: 'Submitted', date: '2024-05-01', location: 'Zone HQ', officerId: '2', filingStation: 'Zone Headquarters', recordingOfficerName: 'Abebe Bikila', recordingOfficerRank: 'commander', type: 'Crime', category: 'other' },
  { id: '2', title: 'Incident 001 Final Report', status: 'Pending Review', date: '2024-05-17', location: 'Bure Market', officerId: '5', filingStation: 'Bure Station', recordingOfficerName: 'Kebede Ayalew', recordingOfficerRank: 'inspector', type: 'Crime', category: 'burglary' },
  { id: '3', title: 'Quarterly Traffic Safety Review', status: 'Submitted', date: '2024-05-30', location: 'Zone HQ', officerId: '1', filingStation: 'Zone Headquarters', recordingOfficerName: 'Derese G.', recordingOfficerRank: 'assistantCommissioner', type: 'Traffic', category: 'other' },
];

export const EMERGENCY_CONTACTS = [
  { id: '1', nameKey: 'westGojjamZone', phone: '0587750972', email: 'wg.police@wgpolice.gov.et', category: 'HQ' },
  { id: '2', nameKey: 'trafficPoliceChief', phone: '0587751002', email: 'traffic.chief@wgpolice.gov.et', category: 'Traffic' },
  { id: '3', nameKey: 'mediaCommunication', phone: '0587750327', email: 'media@wgpolice.gov.et', category: 'Comm' },
  { id: '4', nameKey: 'finoteSelamCity', phone: '0587751097', email: 'fs.station@wgpolice.gov.et', category: 'Station' },
  { id: '5', nameKey: 'bureCity', phone: '0587741004', email: 'bure.city@wgpolice.gov.et', category: 'Station' },
  { id: '6', nameKey: 'bureZuria', phone: '0587740024', email: 'bure.zuria@wgpolice.gov.et', category: 'Station' },
  { id: '7', nameKey: 'dembachaCity', phone: '0587730256', email: 'dembacha.city@wgpolice.gov.et', category: 'Station' },
  { id: '8', nameKey: 'dembachaZuria', phone: '0582311656', email: 'dembacha.zuria@wgpolice.gov.et', category: 'Station' },
];

export const APP_LOGO = "/police-logo.png";
export const APP_VERSION = "1.0.3-prod";
