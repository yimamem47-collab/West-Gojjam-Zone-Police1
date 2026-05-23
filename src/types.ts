export type IncidentStatus = 'Open' | 'In Progress' | 'Closed';
export type AssignmentStatus = 'Pending' | 'Completed';
export type ReportStatus = 'Submitted' | 'Pending Review';

export interface TrafficDetails {
  accidentType?: string;
  accidentImpact?: string;
  numDeaths?: number;
  numHeavyInjuries?: number;
  numLightInjuries?: number;
  propertyDamageEstimate?: string;
  driverExperience?: string;
  vehicleType?: string;
  plateNumber?: string;
  licenseGrade?: string;
  accidentCause?: string;
  reporterName?: string;
  reporterAddress?: string;
  reporterPhone?: string;
  reporterOther?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  date: string;
  location: string;
  lat?: number;
  lng?: number;
  officerId: string;
  filingStation: string;
  recordingOfficerName: string;
  recordingOfficerRank: string;
  type: 'Crime' | 'Traffic';
  category: string;
  description?: string;
  photos?: string[];
  document_url?: string;
  documents?: { name: string; url: string }[];
  voice_url?: string;
  timestamp?: string;
  trafficDetails?: TrafficDetails;
}

export interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
  rank: string;
  email: string;
  station: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Lost';
  photo?: string;
  role?: 'Officer' | 'Admin';
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  status: AssignmentStatus;
  dueDate: string;
  incidentId: string;
  officerId: string;
}

export interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  date: string;
  location?: string;
  officerId: string;
  filingStation: string;
  recordingOfficerName: string;
  recordingOfficerRank: string;
  type: 'Crime' | 'Traffic';
  category: string;
  description?: string;
  photos?: string[];
  document_url?: string;
  documents?: { name: string; url: string }[];
  voice_url?: string;
  timestamp?: string;
  trafficDetails?: TrafficDetails;
}

export interface ZoneReport {
  id: string;
  officer_name: string;
  officer_id: string;
  deputy_dept: string;
  main_dept: string;
  wereda: string;
  report_type: 'Monthly' | 'Quarterly' | '6-Month' | '9-Month' | 'Annual';
  photo_url?: string;
  document_url?: string;
  voice_url?: string;
  timestamp: string;
}

export interface CommunityReport {
  id: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail?: string;
  location: string;
  date: string;
  details: string;
  status: 'New' | 'Reviewed' | 'Action Taken';
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Officer';
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  userId: string;
}
