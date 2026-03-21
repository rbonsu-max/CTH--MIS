import React, { useState, useEffect } from 'react';
import { BarChart3, Users, BookOpen, Loader2 } from 'lucide-react';
import { Student, Program, Course } from '../types';
import { api } from '../services/api';

interface StatisticsModuleProps {
  activeSubItem: string | null;
}

export const StatisticsModule: React.FC<StatisticsModuleProps> = ({ activeSubItem }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, p, c] = await Promise.all([api.getStudents(), api.getPrograms(), api.getCourses()]);
        setStudents(s); setPrograms(p); setCourses(c);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const renderStudentStats = () => {
    const byProgram: Record<string, number> = {};
    const byGender: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    const byStatus: Record<string, number> = {};
    const byLevel: Record<number, number> = {};

    students.forEach(s => {
      const progName = programs.find(p => p.progid === s.progid)?.name || s.progid || 'Unknown';
      byProgram[progName] = (byProgram[progName] || 0) + 1;
      byGender[s.gender || 'Other'] = (byGender[s.gender || 'Other'] || 0) + 1;
      byStatus[s.status || 'active'] = (byStatus[s.status || 'active'] || 0) + 1;
      byLevel[s.current_level || 100] = (byLevel[s.current_level || 100] || 0) + 1;
    });

    const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 ${color} rounded-xl`}>{icon}</div>
          <span className="text-3xl font-black text-slate-900">{value}</span>
        </div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={students.length} icon={<Users size={24} className="text-blue-600" />} color="bg-blue-50" />
          <StatCard title="Programs" value={programs.length} icon={<BookOpen size={24} className="text-emerald-600" />} color="bg-emerald-50" />
          <StatCard title="Male" value={byGender['Male'] || 0} icon={<Users size={24} className="text-indigo-600" />} color="bg-indigo-50" />
          <StatCard title="Female" value={byGender['Female'] || 0} icon={<Users size={24} className="text-pink-600" />} color="bg-pink-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Students by Program</h3></div>
            <div className="p-4 space-y-3">
              {Object.entries(byProgram).sort((a, b) => b[1] - a[1]).map(([prog, count]) => (
                <div key={prog} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{prog}</div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(count / students.length) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-600 w-10 text-right">{count}</span>
                </div>
              ))}
              {Object.keys(byProgram).length === 0 && <p className="text-slate-400 text-sm text-center py-4">No data</p>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Students by Level</h3></div>
            <div className="p-4 space-y-3">
              {Object.entries(byLevel).sort((a, b) => Number(a[0]) - Number(b[0])).map(([level, count]) => (
                <div key={level} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Level {level}</div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${(count / students.length) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-600 w-10 text-right">{count}</span>
                </div>
              ))}
              {Object.keys(byLevel).length === 0 && <p className="text-slate-400 text-sm text-center py-4">No data</p>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Students by Status</h3></div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(byStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td className="px-6 py-3 text-sm capitalize font-medium">{status}</td>
                    <td className="px-6 py-3 text-right text-sm font-bold">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">Gender Distribution</h3></div>
            <div className="p-6 flex items-center justify-center gap-8">
              {Object.entries(byGender).filter(([,v]) => v > 0).map(([gender, count]) => (
                <div key={gender} className="text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white ${gender === 'Male' ? 'bg-blue-500' : gender === 'Female' ? 'bg-pink-500' : 'bg-slate-500'}`}>
                    {count}
                  </div>
                  <p className="text-sm font-medium mt-2 text-slate-600">{gender}</p>
                  <p className="text-xs text-slate-400">{students.length > 0 ? ((count / students.length) * 100).toFixed(1) : 0}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCourseStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl"><BookOpen size={24} className="text-blue-600" /></div>
            <span className="text-3xl font-black text-slate-900">{courses.length}</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Total Courses</p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold">All Courses</h3></div>
        <table className="w-full text-left">
          <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <th className="px-6 py-3">#</th>
            <th className="px-6 py-3">Code</th>
            <th className="px-6 py-3">Title</th>
            <th className="px-6 py-3">Credits</th>
            <th className="px-6 py-3">Department</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c, i) => (
              <tr key={c.cid} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 text-sm text-slate-400">{i + 1}</td>
                <td className="px-6 py-3 text-sm font-mono font-bold">{c.cid}</td>
                <td className="px-6 py-3 text-sm font-medium">{c.title}</td>
                <td className="px-6 py-3 text-sm">{c.credits}</td>
                <td className="px-6 py-3 text-sm text-slate-500">{c.department || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) return <div className="p-12 flex flex-col items-center"><Loader2 size={32} className="text-blue-600 animate-spin mb-4" /><p className="text-slate-500">Loading statistics...</p></div>;

  switch (activeSubItem) {
    case 'student_stats': return renderStudentStats();
    case 'course_stats': return renderCourseStats();
    default: return renderStudentStats();
  }
};
