import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Download,
  Edit2,
  Mic,
  Square,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  Info,
  X,
  Volume2,
  Camera,
  File as FileIcon,
  FileCheck
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';

import { Report, Officer } from '../types';
import { Language, translations } from '../lib/translations';

interface ReportsProps {
  reports: Report[];
  officers: Officer[];
  lang: Language;
  initialEditId?: string | null;
  onAdd: (report: Omit<Report, 'id'>) => Promise<void> | void;
  onUpdate: (
    id: string,
    updates: Partial<Report>
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function Reports({
  reports,
  officers,
  lang,
  initialEditId,
  onAdd,
  onUpdate,
  onDelete
}: ReportsProps) {
  const t = translations[lang];

  const defaultTrafficDetails = {
    accidentType: 'pedestrianCollision',
    accidentImpact: 'death',
    numDeaths: 0,
    numHeavyInjuries: 0,
    numLightInjuries: 0,
    propertyDamageEstimate: '',
    driverExperience: 'exp1to5',
    vehicleType: 'vPrivate',
    plateNumber: '',
    licenseGrade: 'lAutomobile',
    accidentCause: 'Other',
    reporterName: '',
    reporterAddress: '',
    reporterPhone: '',
    reporterOther: ''
  };

  const defaultReport: Omit<Report, 'id'> = {
    title: '',
    status: 'Pending Review',
    date: new Date().toISOString().split('T')[0],
    officerId: officers[0]?.id || '',
    filingStation: '',
    recordingOfficerName: officers[0]?.name || '',
    recordingOfficerRank: officers[0]?.rank || 'constable',
  <div className="grid grid-cols-4 gap-4">
  {(newReport.photos || []).map((photo, index) => (
    <div
      key={index}
      className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group"
    >
      <img
        src={photo}
        alt="Report"
        className="w-full h-full object-cover"
      />

      <button
        type="button"
        onClick={() => removePhoto(index)}
        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={12} />
      </button>
    </div>
  ))}

  {(newReport.photos || []).length < 10 && (
    <button
      type="button"
      onClick={handlePhotoUpload}
      className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
    >
      <Camera
        size={24}
        className="text-brand-text-secondary"
      />

      <span className="text-[10px] uppercase font-bold text-brand-text-secondary">
        ፎቶ
      </span>
    </button>
  )}
</div>

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditId) {
      const report = reports.find((r) => r.id === initialEditId);

      if (report) {
        setEditingReport(report);

        setNewReport({
          ...report,
          photos: report.photos || [],
          documents: report.documents || [],
          voice_url: report.voice_url || '',
          trafficDetails: {
            ...defaultTrafficDetails,
            ...report.trafficDetails
          }
        });

        setIsModalOpen(true);
      }
    }
  }, [initialEditId, reports]);

  useEffect(() => {
    if (officers.length > 0 && !newReport.officerId) {
      setNewReport((prev) => ({
        ...prev,
        officerId: officers[0].id
      }));
    }
  }, [officers, newReport.officerId]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }

          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const filteredReports = reports.filter((r) => {
    const title = r.title || '';
    const category = r.category || '';
    const officer = r.recordingOfficerName || '';

    return (
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handlePhotoUpload = async () => {
    try {
      const {
        Camera,
        CameraResultType,
        CameraSource
      } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });

      if (image.dataUrl) {
        setNewReport((prev) => ({
          ...prev,
          photos: [...(prev.photos || []), image.dataUrl!].slice(0, 10)
        }));
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const removePhoto = (index: number) => {
    setNewReport((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const handleDocUpload = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FilePicker.pickFiles({
          types: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
        });

        const docs: { blob: Blob; name: string }[] = [];

        for (const file of result.files) {
          if (file.path) {
            const response = await fetch(
              Capacitor.convertFileSrc(file.path)
            );

            const blob = await response.blob();

            docs.push({
              blob,
              name: file.name || `file_${Date.now()}`
            });
          }
        }

        setSelectedDocs((prev) => [...prev, ...docs]);
      } else {
        const input = document.createElement('input');

        input.type = 'file';
        input.accept = '.pdf,.doc,.docx';
        input.multiple = true;

        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;

          const files = Array.from(target.files || []);

          const docs = files.map((file) => ({
            blob: file,
            name: file.name
          }));

          setSelectedDocs((prev) => [...prev, ...docs]);
        };

        input.click();
      }
    } catch (err) {
      console.error('Document upload error:', err);
    }
  };

  const removeDoc = (index: number) => {
    setSelectedDocs((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const removeExistingDoc = (index: number) => {
    setNewReport((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter(
        (_, i) => i !== index
      )
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const mimeType = MediaRecorder.isTypeSupported(
        'audio/webm'
      )
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType
      });

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType
        });

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);

        setAudioUrl(url);
      };

      mediaRecorder.start();

      setRecordingDuration(0);
      setIsRecording(true);
    } catch (err) {
      console.error(err);

      alert(
        lang === 'am'
          ? 'ማይክሮፎን መጠቀም አልተቻለም'
          : 'Microphone access denied'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);

    setNewReport({
      ...report,
      photos: report.photos || [],
      documents: report.documents || [],
      voice_url: report.voice_url || '',
      trafficDetails: {
        ...defaultTrafficDetails,
        ...report.trafficDetails
      }
    });

    setCurrentStep(1);

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);

    setEditingReport(null);

    setCurrentStep(1);

    setAudioBlob(null);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);

    setSelectedDocs([]);

    setNewReport({
      ...defaultReport,
      officerId: officers[0]?.id || '',
      recordingOfficerName: officers[0]?.name || '',
      recordingOfficerRank:
        officers[0]?.rank || 'constable'
    });
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (newReport.title.trim().length < 3) {
      alert(
        lang === 'am'
          ? 'እባክዎ ትክክለኛ ርዕስ ያስገቡ'
          : 'Please enter a valid title'
      );

      return;
    }

    if (!newReport.description?.trim()) {
      alert(
        lang === 'am'
          ? 'እባክዎ መግለጫ ያስገቡ'
          : 'Please enter description'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      let finalVoiceUrl = newReport.voice_url || '';

      let finalDocuments = [...(newReport.documents || [])];

      let finalPhotos = [...(newReport.photos || [])];

      const { ref, uploadBytes, getDownloadURL } =
        await import('firebase/storage');

      const { storage } = await import('../firebase');

      if (audioBlob) {
        const voiceRef = ref(
          storage,
          `reports/${Date.now()}_voice.webm`
        );

        const voiceSnapshot = await uploadBytes(
          voiceRef,
          audioBlob
        );

        finalVoiceUrl = await getDownloadURL(
          voiceSnapshot.ref
        );
      }

      if (selectedDocs.length > 0) {
        const uploadedDocs = await Promise.all(
          selectedDocs.map(async (doc) => {
            const docRef = ref(
              storage,
              `reports/${Date.now()}_${doc.name}`
            );

            const snapshot = await uploadBytes(
              docRef,
              doc.blob
            );

            const url = await getDownloadURL(snapshot.ref);

            return {
              name: doc.name,
              url
            };
          })
        );

        finalDocuments = [
          ...finalDocuments,
          ...uploadedDocs
        ];
      }

      finalPhotos = await Promise.all(
        finalPhotos.map(async (photo) => {
          if (photo.startsWith('data:')) {
            const photoRef = ref(
              storage,
              `reports/${Date.now()}_photo.jpg`
            );

            const response = await fetch(photo);

            const blob = await response.blob();

            const snapshot = await uploadBytes(
              photoRef,
              blob,
              {
                contentType: 'image/jpeg'
              }
            );

            return await getDownloadURL(snapshot.ref);
          }

          return photo;
        })
      );

      const reportData = {
        ...newReport,
        voice_url: finalVoiceUrl,
        documents: finalDocuments,
        photos: finalPhotos
      };

      if (editingReport) {
        await onUpdate(editingReport.id, reportData);
      } else {
        await onAdd(reportData);
      }

      handleCloseModal();
    } catch (err) {
      console.error(err);

      alert(
        lang === 'am'
          ? 'ሪፖርት ማስገባት አልተሳካም'
          : 'Failed to submit report'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t.reports || 'Reports'}
          </h1>

          <p className="text-brand-text-secondary">
            Official documentation and reports
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          {t.newReport}
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary"
          />

          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="px-6 py-4 text-left">
                Title
              </th>

              <th className="px-6 py-4 text-left">
                Station
              </th>

              <th className="px-6 py-4 text-left">
                Officer
              </th>

              <th className="px-6 py-4 text-left">
                Status
              </th>

              <th className="px-6 py-4 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.map((report) => (
              <tr
                key={report.id}
                className="border-b border-brand-border hover:bg-brand-bg/30"
              >
                <td className="px-6 py-4">
                  {report.title}
                </td>

                <td className="px-6 py-4">
                  {report.filingStation}
                </td>

                <td className="px-6 py-4">
                  {report.recordingOfficerName}
                </td>

                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                    {report.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {report.voice_url && (
                      <button
                        onClick={() =>
                          setActiveAudio(report.id)
                        }
                        className="p-2 hover:bg-brand-bg rounded-lg"
                      >
                        <Volume2 size={18} />
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleEdit(report)
                      }
                      className="p-2 hover:bg-brand-bg rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>

                    <button
                      onClick={() =>
                        onDelete(report.id)
                      }
                      className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>

                    <button className="p-2 hover:bg-brand-bg rounded-lg">
                      <Download size={18} />
                    </button>
                  </div>

                  {activeAudio === report.id &&
                    report.voice_url && (
                      <div className="mt-2">
                        <audio
                          controls
                          autoPlay
                          src={report.voice_url}
                          className="w-full"
                        />
                      </div>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              exit={{
                opacity: 0,
                scale: 0.95
              }}
              className="glass-card w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">
                  {editingReport
                    ? t.editReport
                    : t.newReport}
                </h2>

                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-brand-bg rounded-full"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Steps */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className="flex items-center"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep === step
                          ? 'bg-brand-accent text-white'
                          : currentStep > step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-brand-bg border border-brand-border'
                      }`}
                    >
                      {currentStep > step ? (
                        <CheckCircle size={16} />
                      ) : (
                        step
                      )}
                    </div>

                    {step < 3 && (
                      <div className="w-10 h-[2px] bg-brand-border" />
                    )}
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Report Title
                      </label>

                      <input
                        type="text"
                        className="input-field"
                        value={newReport.title}
                        onChange={(e) =>
                          setNewReport({
                            ...newReport,
                            title: e.target.value
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 text-sm font-medium">
                          Type
                        </label>

                        <select
                          className="input-field"
                          value={newReport.type}
                          onChange={(e) =>
                            setNewReport({
                              ...newReport,
                              type: e.target
                                .value as any
                            })
                          }
                        >
                          <option value="Crime">
                            Crime
                          </option>

                          <option value="Traffic">
                            Traffic
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium">
                          Date
                        </label>

                        <input
                          type="date"
                          className="input-field"
                          value={newReport.date}
                          onChange={(e) =>
                            setNewReport({
                              ...newReport,
                              date: e.target.value
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Filing Station
                      </label>

                      <input
                        type="text"
                        className="input-field"
                        value={
                          newReport.filingStation
                        }
                        onChange={(e) =>
                          setNewReport({
                            ...newReport,
                            filingStation:
                              e.target.value
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">
                        Description
                      </label>

                      <textarea
                        className="input-field min-h-[120px]"
                        value={
                          newReport.description
                        }
                        onChange={(e) =>
                          setNewReport({
                            ...newReport,
                            description:
                              e.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {/* Photos */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="font-medium">
                          Photos
                        </label>

                        <button
                          type="button"
                          onClick={
                            handlePhotoUpload
                          }
                          className="btn-secondary flex items-center gap-2"
                        >
                          <Camera size={16} />
                          Add Photo
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {(newReport.photos || []).map(
                          (photo, index) => (
                            <div
                              key={index}
                              className="relative aspect-square rounded-xl overflow-hidden"
                            >
                              <img
                                src={photo}
                                alt=""
                                className="w-full h-full object-cover"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removePhoto(index)
                                }
                                className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="font-medium">
                          Documents
                        </label>

                        <button
                          type="button"
                          onClick={
                            handleDocUpload
                          }
                          className="btn-secondary flex items-center gap-2"
                        >
                          <FileIcon size={16} />
                          Add File
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedDocs.map(
                          (doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg border border-brand-border"
                            >
                              <div className="flex items-center gap-2">
                                <FileCheck
                                  size={18}
                                />

                                <span>
                                  {doc.name}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeDoc(index)
                                }
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Audio */}
                    <div>
                      <label className="block mb-4 font-medium">
                        Voice Note
                      </label>

                      {!isRecording &&
                      !audioUrl ? (
                        <button
                          type="button"
                          onClick={
                            startRecording
                          }
                          className="btn-primary flex items-center gap-2"
                        >
                          <Mic size={18} />
                          Start Recording
                        </button>
                      ) : isRecording ? (
                        <button
                          type="button"
                          onClick={
                            stopRecording
                          }
                          className="bg-rose-500 text-white px-4 py-3 rounded-xl flex items-center gap-2"
                        >
                          <Square
                            size={18}
                          />
                          Stop Recording
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <audio
                            controls
                            src={audioUrl!}
                            className="w-full"
                          />

                          <button
                            type="button"
                            onClick={
                              deleteRecording
                            }
                            className="btn-secondary"
                          >
                            Delete Recording
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-4 pt-6 border-t border-brand-border">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentStep(
                          currentStep - 1
                        )
                      }
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                  )}

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentStep(
                          currentStep + 1
                        )
                      }
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      Next
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Send size={18} />

                      {isSubmitting
                        ? 'Submitting...'
                        : editingReport
                        ? 'Update Report'
                        : 'Submit Report'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
