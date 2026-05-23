export interface CrimeReport {
  id: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: string;
  officerRank: string;
  officerName: string;
  station: string;
  type: 'crime' | 'traffic';
  status: 'pending' | 'investigating' | 'resolved';
  createdAt: number;
  photos?: string[];
  audio?: string;
  synced?: boolean;
}

export interface UserProfile {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
}

export interface EmergencyContact {
  name: string;
  nameAm: string;
  phone: string;
  category: 'Police' | 'Traffic' | 'Emergency';
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'General Emergency', nameAm: 'አጠቃላይ ድንገተኛ አደጋ', phone: '991', category: 'Emergency' },
  { name: 'West Gojjam Zone Police', nameAm: 'የምዕራብ ጎጃም ዞን ፖሊስ', phone: '0587750972', category: 'Police' },
  { name: 'Finote Selam Police', nameAm: 'የፍኖተ ሰላም ፖሊስ', phone: '0587751097', category: 'Police' },
  { name: 'Bure City Police', nameAm: 'ቡሬ ከተማ ፖሊስ', phone: '0587741004', category: 'Police' },
  { name: 'Bure Zuria Police', nameAm: 'ቡሬ ዙሪያ ፖሊስ', phone: '0587740024', category: 'Police' },
  { name: 'Dembecha City Police', nameAm: 'ደምበጫ ከተማ ፖሊስ', phone: '0587730256', category: 'Police' },
  { name: 'Dembecha Zuria Police', nameAm: 'ደምበጫ ዙሪያ ፖሊስ', phone: '0582311656', category: 'Police' },
  { name: 'Jiga Police Station', nameAm: 'የጂጋ ፖሊስ ጣቢያ', phone: '0582203456', category: 'Police' },
  { name: 'Traffic Police Main', nameAm: 'የትራፊክ ፖሊስ ዋና', phone: '0587751102', category: 'Traffic' },
];

const STORAGE_KEY = 'wg_police_reports';
const PROFILE_KEY = 'wg_police_profile';

export const storage = {
  saveReport: (report: Omit<CrimeReport, 'id' | 'createdAt'>) => {
    const reports = storage.getReports();
    const newReport: CrimeReport = {
      ...report,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      synced: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newReport, ...reports]));
    return newReport;
  },
  getReports: (): CrimeReport[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  getStats: () => {
    const reports = storage.getReports();
    return {
      total: reports.length,
      crime: reports.filter(r => r.type === 'crime').length,
      traffic: reports.filter(r => r.type === 'traffic').length,
    };
  },
  deleteReport: (id: string) => {
    const reports = storage.getReports();
    const filtered = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },
  updateReport: (id: string, data: Partial<Omit<CrimeReport, 'id' | 'createdAt'>>) => {
    const reports = storage.getReports();
    const updated = reports.map(r => r.id === id ? { ...r, ...data } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
  syncReports: async () => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    const reports = storage.getReports();
    const updated = reports.map(r => ({ ...r, synced: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },
  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  getProfile: (): UserProfile | null => {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }
};
