import React, { useState, useEffect, useMemo } from 'react';
import { STUDENTS, SURAHS } from './constants';
import { MemorizationLog, Student, Surah } from './types';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  ChevronRight, 
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  BarChart3,
  FileText,
  X,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';

export default function App() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<MemorizationLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Form state
  const [newLog, setNewLog] = useState<Partial<MemorizationLog>>({
    surah_name: SURAHS[0].name,
    start_ayat: 1,
    end_ayat: 1,
    date: new Date().toISOString().split('T')[0],
    grade: 'A'
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const logData = {
      ...newLog,
      student_name: selectedStudent.name
    };

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (response.ok) {
        fetchLogs();
      }
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Hapus catatan ini?')) return;
    try {
      await fetch(`/api/logs/${id}`, { 
        method: 'DELETE' 
      });
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };

  const filteredStudents = STUDENTS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStudentLogs = (studentName: string) => {
    return logs.filter(l => l.student_name === studentName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const calculateProgress = (studentName: string, surahName: string) => {
    const studentSurahLogs = logs.filter(l => l.student_name === studentName && l.surah_name === surahName);
    if (studentSurahLogs.length === 0) return 0;
    
    // Get the latest log for this surah
    const latestLog = studentSurahLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const surah = SURAHS.find(s => s.name === surahName);
    if (!surah) return 0;
    
    return Math.min(100, Math.round((latestLog.end_ayat / surah.totalAyat) * 100));
  };

  // Individual Student Timeline Data
  const studentTimelineData = useMemo(() => {
    if (!selectedStudent) return [];
    
    const studentLogs = logs
      .filter(l => l.student_name === selectedStudent.name)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date to show total progress over time
    const timeline: any[] = [];
    const surahProgress: Record<string, number> = {};

    studentLogs.forEach(log => {
      surahProgress[log.surah_name] = log.end_ayat;
      
      // Calculate total progress % at this point in time
      let totalAyat = 0;
      let totalMaxAyat = 0;
      SURAHS.forEach(s => {
        totalAyat += surahProgress[s.name] || 0;
        totalMaxAyat += s.totalAyat;
      });

      const gradeMap: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };

      timeline.push({
        date: new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        progress: Math.round((totalAyat / totalMaxAyat) * 100),
        grade: gradeMap[log.grade] || 0,
        surah: log.surah_name
      });
    });

    return timeline;
  }, [logs, selectedStudent]);

  // Report Data Calculations
  const reportData = useMemo(() => {
    const surahStats = SURAHS.map(surah => {
      // For each student, get their latest log for this surah
      const latestLogsPerStudent = STUDENTS.map(student => {
        const studentSurahLogs = logs.filter(l => l.student_name === student.name && l.surah_name === surah.name);
        return studentSurahLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      }).filter(Boolean);

      const avgProgress = latestLogsPerStudent.length > 0 
        ? Math.round(latestLogsPerStudent.reduce((acc, curr) => {
            const progress = (curr.end_ayat / surah.totalAyat) * 100;
            return acc + progress;
          }, 0) / STUDENTS.length)
        : 0;
      
      return {
        name: surah.name,
        progress: avgProgress,
        count: latestLogsPerStudent.length
      };
    });

    const gradeDistribution = [
      { name: 'A', value: logs.filter(l => l.grade === 'A').length, color: '#10b981' },
      { name: 'B', value: logs.filter(l => l.grade === 'B').length, color: '#3b82f6' },
      { name: 'C', value: logs.filter(l => l.grade === 'C').length, color: '#f59e0b' },
      { name: 'D', value: logs.filter(l => l.grade === 'D').length, color: '#ef4444' },
    ].filter(g => g.value > 0);

    return { surahStats, gradeDistribution };
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Jurnal Hafalan 5C</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Semester 2 • 2025/2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!selectedStudent && (
              <button 
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Laporan
              </button>
            )}
            {selectedStudent && (
              <button 
                onClick={() => setSelectedStudent(null)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {!selectedStudent ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text"
                    placeholder="Cari nama murid..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <User className="text-emerald-700 w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-emerald-900">Total Murid</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">{STUDENTS.length}</span>
                </div>
              </div>

              {/* Student Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => {
                  const studentLogs = getStudentLogs(student.name);
                  const lastLog = studentLogs[0];
                  
                  return (
                    <motion.button
                      key={student.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedStudent(student)}
                      className="bg-white border border-slate-200 p-4 rounded-2xl text-left hover:border-emerald-500 hover:shadow-md transition-all group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-slate-100 group-hover:bg-emerald-50 p-2 rounded-xl transition-colors">
                          <User className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-400" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">{student.name}</h3>
                      
                      <div className="space-y-2 mt-4">
                        {SURAHS.slice(0, 3).map(surah => {
                          const progress = calculateProgress(student.name, surah.name);
                          return (
                            <div key={surah.name} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>{surah.name}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-500" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {lastLog && (
                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2 text-[11px] text-slate-400">
                          <Award className="w-3 h-3 text-emerald-500" />
                          <span>Nilai Terakhir: {lastLog.grade}</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left Column: Form & Progress */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                      <Plus className="text-emerald-700 w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-lg">Update Setoran</h2>
                  </div>

                  <form onSubmit={handleAddLog} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Surah</label>
                      <select 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        value={newLog.surah_name}
                        onChange={(e) => setNewLog({ ...newLog, surah_name: e.target.value })}
                      >
                        {SURAHS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dari Ayat</label>
                        <input 
                          type="number"
                          min="1"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          value={newLog.start_ayat === undefined || isNaN(newLog.start_ayat) ? '' : newLog.start_ayat}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setNewLog({ ...newLog, start_ayat: isNaN(val) ? undefined : val });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sampai Ayat</label>
                        <input 
                          type="number"
                          min="1"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          value={newLog.end_ayat === undefined || isNaN(newLog.end_ayat) ? '' : newLog.end_ayat}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setNewLog({ ...newLog, end_ayat: isNaN(val) ? undefined : val });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nilai</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['A', 'B', 'C', 'D'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setNewLog({ ...newLog, grade: g as any })}
                            className={`py-2 rounded-xl font-bold transition-all border ${
                              newLog.grade === g 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label>
                      <input 
                        type="date"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        value={newLog.date}
                        onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
                    >
                      Update Data
                    </button>
                  </form>
                </div>

                {/* Progress Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Ringkasan Progres</h3>
                  <div className="space-y-4">
                    {SURAHS.map(surah => {
                      const progress = calculateProgress(selectedStudent.name, surah.name);
                      return (
                        <div key={surah.name} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">{surah.name}</span>
                            <span className={progress === 100 ? "text-emerald-600" : "text-slate-400"}>
                              {progress}% {progress === 100 && '✓'}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: History */}
              <div className="lg:col-span-2 space-y-6">
                {/* Individual Progress Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Grafik Perkembangan Hafalan</h3>
                  </div>
                  <div className="h-[250px] w-full">
                    {studentTimelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={studentTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8' }} 
                            unit="%" 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingBottom: '20px' }} />
                          <Line 
                            name="Total Progres"
                            type="monotone" 
                            dataKey="progress" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Belum ada data untuk grafik.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg">{selectedStudent.name}</h2>
                      <p className="text-sm text-slate-500">Riwayat Setoran Hafalan</p>
                    </div>
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {getStudentLogs(selectedStudent.name).length} Catatan
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {getStudentLogs(selectedStudent.name).length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Clock className="text-slate-300 w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-medium">Belum ada data hafalan.</p>
                      </div>
                    ) : (
                      getStudentLogs(selectedStudent.name).map((log) => (
                        <div key={log.id} className="p-5 hover:bg-slate-50 transition-colors group">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                              <div className="bg-emerald-50 p-2.5 h-fit rounded-xl">
                                <CheckCircle2 className="text-emerald-600 w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-800">{log.surah_name}</span>
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    Ayat {log.start_ayat} - {log.end_ayat}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(log.date).toLocaleDateString('id-ID', { 
                                      day: 'numeric', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                                    <Award className="w-3 h-3" />
                                    Nilai: {log.grade}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteLog(log.id!)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-xl">
                    <BarChart3 className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl">Laporan Rangkuman Kelas 5C</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Statistik Hafalan & Nilai</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReport(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Setoran</p>
                    <p className="text-3xl font-black text-emerald-900">{logs.length}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Rata-rata Progres</p>
                    <p className="text-3xl font-black text-blue-900">
                      {Math.round(reportData.surahStats.reduce((a, b) => a + b.progress, 0) / SURAHS.length)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Nilai A Terbanyak</p>
                    <p className="text-3xl font-black text-amber-900">
                      {logs.filter(l => l.grade === 'A').length}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Chart 1: Surah Progress */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800">Rata-rata Progres per Surah</h3>
                    </div>
                    <div className="h-[300px] w-full bg-slate-50 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.surahStats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                            {reportData.surahStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Grade Distribution */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800">Distribusi Nilai</h3>
                    </div>
                    <div className="h-[300px] w-full bg-slate-50 rounded-2xl p-4 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.gradeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {reportData.gradeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 ml-4">
                        {reportData.gradeDistribution.map(g => (
                          <div key={g.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                            <span className="text-xs font-bold text-slate-600">Nilai {g.name}: {g.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-800">Rangkuman Progres Seluruh Murid</h3>
                  </div>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Nama Murid</th>
                          {SURAHS.map(s => <th key={s.name} className="px-4 py-3 text-center">{s.name}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {STUDENTS.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-700">{student.name}</td>
                            {SURAHS.map(surah => {
                              const log = logs.find(l => l.student_name === student.name && l.surah_name === surah.name);
                              return (
                                <td key={surah.name} className="px-4 py-3 text-center">
                                  {log ? (
                                    <div className="flex flex-col items-center">
                                      <span className="font-bold text-emerald-600">{log.grade}</span>
                                      <span className="text-[10px] text-slate-400">Ayat {log.end_ayat}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Cetak Laporan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto p-8 text-center text-slate-400 text-xs">
        <p>© 2025 Jurnal Hafalan Digital Kelas 5C • SD Islam Terpadu</p>
      </footer>
    </div>
  );
}
