import { useState, useEffect } from 'react';
import { Incident, Officer, Assignment, Report, User, ZoneReport, ChatMessage } from '../types';
import { INITIAL_OFFICERS, INITIAL_INCIDENTS, INITIAL_ASSIGNMENTS, INITIAL_REPORTS } from '../constants';
import { db, handleFirestoreError, OperationType, CRIME_REPORTS_COLLECTION } from '../firebase';
import { formatFirestoreTimestamp } from '../lib/utils';
import { sendTelegramMessage, formatIncidentMessage, formatOfficerMessage, formatAssignmentMessage, escapeHtml } from '../services/telegramService';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  deleteField,
  serverTimestamp
} from 'firebase/firestore';

export function useAppData() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [zoneReports, setZoneReports] = useState<ZoneReport[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Sync with Firestore
  useEffect(() => {
    if (!user) {
      setOfficers([]);
      setIncidents([]);
      setAssignments([]);
      setReports([]);
      setZoneReports([]);
      setChatMessages([]);
      return;
    }

    const isAdmin = user.role === 'Admin';

    // Officers query
    const officersQuery = isAdmin 
      ? collection(db, 'officers') 
      : query(collection(db, 'officers'), where('email', '==', user.email));

    const unsubOfficers = onSnapshot(officersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Officer);
      let finalOfficers = data;
      if (data.length === 0 && isAdmin) {
        finalOfficers = INITIAL_OFFICERS;
      } else if (data.length === 0 && !isAdmin && user) {
        finalOfficers = [{
          id: user.id,
          name: user.name,
          email: user.email,
          rank: 'constable',
          badgeNumber: 'PENDING',
          station: 'Pending Assignment',
          phone: '',
          status: 'Active'
        }];
      }
      setOfficers(finalOfficers);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'officers');
    });

    // Incidents query (using WestGojjam_Reports collection)
    const incidentsQuery = isAdmin 
      ? collection(db, CRIME_REPORTS_COLLECTION) 
      : query(collection(db, CRIME_REPORTS_COLLECTION), where('officerId', '==', user.id));

    const unsubIncidents = onSnapshot(incidentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          timestamp: formatFirestoreTimestamp(d.timestamp)
        } as Incident;
      });
      setIncidents(data.length > 0 ? data : (isAdmin ? INITIAL_INCIDENTS : []));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, CRIME_REPORTS_COLLECTION);
    });

    // Assignments query
    const assignmentsQuery = isAdmin 
      ? collection(db, 'assignments') 
      : query(collection(db, 'assignments'), where('officerId', '==', user.id));

    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Assignment);
      setAssignments(data.length > 0 ? data : (isAdmin ? INITIAL_ASSIGNMENTS : []));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'assignments');
    });

    // Reports query
    const reportsQuery = isAdmin 
      ? collection(db, 'reports') 
      : query(collection(db, 'reports'), where('officerId', '==', user.id));

    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Report);
      setReports(data.length > 0 ? data : (isAdmin ? INITIAL_REPORTS : []));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reports');
    });

    // Zone Reports query
    const zoneReportsQuery = isAdmin 
      ? collection(db, 'zone_detailed_reports') 
      : query(collection(db, 'zone_detailed_reports'), where('officer_id', '==', user.id));

    const unsubZoneReports = onSnapshot(zoneReportsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          timestamp: formatFirestoreTimestamp(d.timestamp)
        } as ZoneReport;
      });
      setZoneReports(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'zone_detailed_reports');
    });

    // Chat Messages query
    const chatMessagesQuery = query(
      collection(db, 'chat_messages'), 
      where('userId', '==', user.id)
    );

    const unsubChatMessages = onSnapshot(chatMessagesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          timestamp: formatFirestoreTimestamp(d.timestamp)
        } as ChatMessage;
      });
      // Sort by timestamp
      setChatMessages(data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'chat_messages');
    });

    return () => {
      unsubOfficers();
      unsubIncidents();
      unsubAssignments();
      unsubReports();
      unsubZoneReports();
      unsubChatMessages();
    };
  }, [user]);

  const addOfficer = async (officer: Omit<Officer, 'id'>) => {
    const officerRef = doc(collection(db, 'officers'));
    const id = officerRef.id;
    const newOfficer = { 
      ...officer, 
      id,
      timestamp: serverTimestamp() as any
    };
    try {
      await setDoc(officerRef, newOfficer);
      await sendTelegramMessage(formatOfficerMessage(newOfficer));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `officers/${id}`);
    }
  };

  const updateOfficer = async (id: string, updates: Partial<Officer>) => {
    try {
      await updateDoc(doc(db, 'officers', id), {
        ...updates,
        timestamp: serverTimestamp()
      });
      const updatedOfficer = officers.find(o => o.id === id);
      if (updatedOfficer) {
        await sendTelegramMessage(formatOfficerMessage({ ...updatedOfficer, ...updates }, true));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `officers/${id}`);
    }
  };

  const deleteOfficer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'officers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `officers/${id}`);
    }
  };

  const cleanForCreate = (obj: any) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    return cleaned;
  };

  const cleanForUpdate = (obj: any) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        cleaned[key] = deleteField();
      }
    });
    return cleaned;
  };

  const addIncident = async (incident: Omit<Incident, 'id'>) => {
    const docRef = doc(collection(db, CRIME_REPORTS_COLLECTION));
    const id = docRef.id;
    const officerId = incident.officerId || user?.id || '';
    const officer = officers.find(o => o.id === officerId);
    const enrichedIncident = cleanForCreate({
      ...incident,
      id,
      officerId,
      recordingOfficerName: officer?.name || incident.recordingOfficerName || 'Unknown',
      recordingOfficerRank: officer?.rank || incident.recordingOfficerRank || 'constable',
      timestamp: serverTimestamp()
    });
    try {
      await setDoc(docRef, enrichedIncident);
      await sendTelegramMessage(formatIncidentMessage(enrichedIncident, 'Incident'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${CRIME_REPORTS_COLLECTION}/${id}`);
    }
  };

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    try {
      let finalUpdates = { ...updates };
      if (updates.officerId) {
        const officer = officers.find(o => o.id === updates.officerId);
        if (officer) {
          finalUpdates.recordingOfficerName = officer.name;
          finalUpdates.recordingOfficerRank = officer.rank;
        }
      }
      await updateDoc(doc(db, CRIME_REPORTS_COLLECTION, id), {
        ...cleanForUpdate(finalUpdates),
        timestamp: serverTimestamp()
      });
      const updatedIncident = incidents.find(i => i.id === id);
      if (updatedIncident) {
        await sendTelegramMessage(formatIncidentMessage({ ...updatedIncident, ...finalUpdates }, 'Incident', true));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${CRIME_REPORTS_COLLECTION}/${id}`);
    }
  };

  const deleteIncident = async (id: string) => {
    try {
      await deleteDoc(doc(db, CRIME_REPORTS_COLLECTION, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${CRIME_REPORTS_COLLECTION}/${id}`);
    }
  };

  const addAssignment = async (assignment: Omit<Assignment, 'id'>) => {
    const docRef = doc(collection(db, 'assignments'));
    const id = docRef.id;
    const officerId = user?.id || assignment.officerId || '';
    const newAssignment = cleanForCreate({ 
      ...assignment, 
      id, 
      officerId,
      timestamp: serverTimestamp()
    });
    try {
      await setDoc(docRef, newAssignment);
      await sendTelegramMessage(formatAssignmentMessage(newAssignment));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `assignments/${id}`);
    }
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>) => {
    try {
      await updateDoc(doc(db, 'assignments', id), {
        ...cleanForUpdate(updates),
        timestamp: serverTimestamp()
      });
      const updatedAssignment = assignments.find(a => a.id === id);
      if (updatedAssignment) {
        await sendTelegramMessage(formatAssignmentMessage({ ...updatedAssignment, ...updates }, true));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `assignments/${id}`);
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'assignments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assignments/${id}`);
    }
  };

  const addReport = async (report: Omit<Report, 'id'>) => {
    const docRef = doc(collection(db, 'reports'));
    const id = docRef.id;
    const officerId = report.officerId || user?.id || '';
    const officer = officers.find(o => o.id === officerId);
    const enrichedReport = cleanForCreate({
      ...report,
      id,
      officerId,
      recordingOfficerName: officer?.name || report.recordingOfficerName || 'Unknown',
      recordingOfficerRank: officer?.rank || report.recordingOfficerRank || 'constable',
      timestamp: serverTimestamp()
    });
    try {
      await setDoc(docRef, enrichedReport);
      await sendTelegramMessage(formatIncidentMessage(enrichedReport, 'Report'));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${id}`);
    }
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    try {
      let finalUpdates = { ...updates };
      if (updates.officerId) {
        const officer = officers.find(o => o.id === updates.officerId);
        if (officer) {
          finalUpdates.recordingOfficerName = officer.name;
          finalUpdates.recordingOfficerRank = officer.rank;
        }
      }
      await updateDoc(doc(db, 'reports', id), {
        ...cleanForUpdate(finalUpdates),
        timestamp: serverTimestamp()
      });
      const updatedReport = reports.find(r => r.id === id);
      if (updatedReport) {
        await sendTelegramMessage(formatIncidentMessage({ ...updatedReport, ...finalUpdates }, 'Report', true));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${id}`);
    }
  };

  const addZoneReport = async (report: Omit<ZoneReport, 'id' | 'timestamp'>) => {
    const docRef = doc(collection(db, 'zone_detailed_reports'));
    const id = docRef.id;
    const newReport = { 
      ...report, 
      id, 
      timestamp: serverTimestamp() as any 
    };
    try {
      await setDoc(docRef, newReport);
      await sendTelegramMessage(`📋 <b>New Zone Detailed Report</b>\n---------------------------\n<b>Officer:</b> ${escapeHtml(newReport.officer_name)}\n<b>Deputy Dept:</b> ${escapeHtml(newReport.deputy_dept)}\n<b>Main Dept:</b> ${escapeHtml(newReport.main_dept)}\n<b>Wereda:</b> ${escapeHtml(newReport.wereda)}\n<b>Type:</b> ${escapeHtml(newReport.report_type)}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `zone_detailed_reports/${id}`);
    }
  };

  const addChatMessage = async (message: Omit<ChatMessage, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) return '';
    const docRef = doc(collection(db, 'chat_messages'));
    const id = docRef.id;
    const newMessage = { 
      ...message, 
      id, 
      userId: user.id,
      timestamp: serverTimestamp() as any
    };
    try {
      await setDoc(docRef, newMessage);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chat_messages/${id}`);
      return '';
    }
  };

  const updateChatMessage = async (id: string, text: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'chat_messages', id), { text });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chat_messages/${id}`);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    try {
      // Local clear first for responsiveness
      setChatMessages([]);
      
      // We should ideally delete them from Firestore too
      // For simplicity in this environment, we'll just clear the local state
      // and maybe add a flag or just leave it as is if batch delete is too complex.
      // But let's try a simple loop for now if the list is small.
      for (const msg of chatMessages) {
        await deleteDoc(doc(db, 'chat_messages', msg.id));
      }
    } catch (err) {
      console.error("Clear chat error:", err);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return {
    officers, incidents, assignments, reports, zoneReports, chatMessages, user,
    addOfficer, updateOfficer, deleteOfficer,
    addIncident, updateIncident, deleteIncident,
    addAssignment, updateAssignment, deleteAssignment,
    addReport, updateReport, deleteReport,
    addZoneReport, addChatMessage, updateChatMessage, clearChatHistory,
    login, logout, setUser
  };
}
