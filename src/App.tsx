import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Menu,
  FileSpreadsheet,
  Plus,
  Loader2,
  Clock,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { NAV_ITEMS } from './constants';
import { ModuleType, User, Registration, CalendarEvent, NotificationItem } from './types';
import { StudentsModule } from './components/StudentsModule';
import { ProgramsModule } from './components/ProgramsModule';
import { CoursesModule } from './components/CoursesModule';
import { RegistrationModule } from './components/RegistrationModule';
import { AssessmentModule } from './components/AssessmentModule';
import { LecturersModule } from './components/LecturersModule';
import { SettingsModule } from './components/SettingsModule';
import { AcademicRecordsModule } from './components/AcademicRecordsModule';
import { StatisticsModule } from './components/StatisticsModule';
import { StudentPortalModule } from './components/StudentPortalModule';
import { Login } from './components/Login';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [activeSubItem, setActiveSubItem] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['dashboard']));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPrograms: 0,
    totalCourses: 0,
    registrationRate: '0%'
  });
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([]);
  const [currentYear, setCurrentYear] = useState<string>('Loading...');
  const [currentSemester, setCurrentSemester] = useState<string>('Loading...');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [user]);

  // Idle Timer logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_TIME = 3 * 60 * 1000; // 3 minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          handleLogout();
        }, INACTIVITY_TIME);
      }
    };

    if (user) {
      resetTimer();
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => document.addEventListener(event, resetTimer));

      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => document.removeEventListener(event, resetTimer));
      };
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.role === 'Student') setActiveModule('student_portal');
        fetchDashboardData();
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [studentsData, programsData, coursesData, registrationsData, yearsData, semsData, eventsData] = await Promise.all([
        api.getStudents(),
        api.getPrograms(),
        api.getCourses(),
        api.getRegistrations(),
        api.getAcademicYears(),
        api.getSemesters(),
        api.getCalendarEvents()
      ]);

      const students = Array.isArray(studentsData) ? studentsData : [];
      const programs = Array.isArray(programsData) ? programsData : [];
      const courses = Array.isArray(coursesData) ? coursesData : [];
      const registrations = Array.isArray(registrationsData) ? registrationsData : [];
      const years = Array.isArray(yearsData) ? yearsData : [];
      const sems = Array.isArray(semsData) ? semsData : [];
      const events = Array.isArray(eventsData) ? eventsData : [];

      const activeYear = years.find(y => y.is_current);
      const activeSem = sems.find(s => s.is_current);
      
      const currentRegs = activeYear && activeSem 
        ? registrations.filter(r => r.academic_year === activeYear.code && r.semester_sid === activeSem.sid)
        : [];
      
      const registeredStudentCount = new Set(currentRegs.map(r => r.index_no)).size;
      
      setStats({
        totalStudents: students.length,
        totalPrograms: programs.length,
        totalCourses: courses.length,
        registrationRate: students.length > 0 
          ? `${Math.round((registeredStudentCount / students.length) * 100)}%` 
          : '0%'
      });

      setRecentRegistrations(registrations.slice(0, 5));
      setCalendarEvents(events.slice(0, 4));
      
      if (activeYear) setCurrentYear(activeYear.code);
      if (activeSem) setCurrentSemester(activeSem.name);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setActiveModule('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleOpenAccountSettings = () => {
    setShowProfilePopover(false);
    setActiveModule('settings');
    setActiveSubItem('account_settings');
  };

  const handleOpenProfile = () => {
    setShowProfilePopover(false);
    if (user?.role === 'Student') {
      setActiveModule('student_portal');
      setActiveSubItem('overview');
      return;
    }
    setActiveModule('settings');
    setActiveSubItem('account_settings');
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.is_read) {
        await api.markNotificationRead(notification.id);
        setNotifications((prev) => prev.map((item) => (
          item.id === notification.id ? { ...item, is_read: true } : item
        )));
      }

      if (notification.type === 'assessment_uploaded' || notification.type === 'assessment_bulk_upload') {
        setActiveModule('assessment');
        setActiveSubItem('by_course');
      } else if (notification.type === 'access_request') {
        setActiveModule('settings');
        setActiveSubItem('access_requests');
      }

      setShowNotifications(false);
    } catch (error) {
      console.error('Failed to open notification:', error);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavClick = (id: ModuleType, hasSubItems: boolean) => {
    if (hasSubItems) {
      toggleExpand(id);
    } else {
      setActiveModule(id);
      setActiveSubItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={48} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => { 
      setUser(u); 
      if (u.role === 'Student') setActiveModule('student_portal');
      fetchDashboardData(); 
    }} />;
  }

  const filteredNavItems = NAV_ITEMS
    .filter(item => item.roles.includes(user.role))
    .map(item => ({
      ...item,
      subItems: item.subItems 
        ? item.subItems.filter(sub => !sub.roles || sub.roles.includes(user.role))
        : undefined
    }));
  const unreadNotifications = notifications.filter((item) => !item.is_read);

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
          <p className="text-slate-500">Here's what's happening in SIMS today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm font-medium">{currentYear} Academic Year</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <span className="text-sm font-medium">{currentSemester}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Students', value: (stats.totalStudents || 0).toLocaleString(), icon: <Users className="text-blue-600" />, trend: 'Current enrollment' },
          { label: 'Active Programs', value: (stats.totalPrograms || 0).toString(), icon: <GraduationCap className="text-emerald-600" />, trend: 'Available programs' },
          { label: 'Courses Mounted', value: (stats.totalCourses || 0).toString(), icon: <BookOpen className="text-violet-600" />, trend: 'Current semester' },
          { label: 'Registration Rate', value: stats.registrationRate, icon: <Calendar className="text-orange-600" />, trend: 'Students registered' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-5 md:p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                {stat.icon}
              </div>
            </div>
            <h3 className="text-slate-500 text-xs md:text-sm font-medium">{stat.label}</h3>
            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{stat.value}</div>
            <p className="text-[10px] md:text-xs text-slate-400 mt-2">{stat.trend}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="p-5 md:p-6 border-b border-slate-100">
              <h2 className="font-bold text-lg">Quick Actions</h2>
            </div>
            <div className="p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
              {filteredNavItems.filter(item => item.id !== 'dashboard').slice(0, 6).map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveModule(item.id)}
                  className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-white transition-colors mb-2 md:mb-3">
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20, className: 'text-slate-600 group-hover:text-blue-600' })}
                  </div>
                  <span className="text-xs md:text-sm font-medium text-slate-700 group-hover:text-blue-700 text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg">Recent Registrations</h2>
              <button 
                onClick={() => setActiveModule('registration')}
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-semibold">Student</th>
                    <th className="px-6 py-3 font-semibold">Course</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRegistrations.length > 0 ? (
                    recentRegistrations.map((reg, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                              {reg.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{reg.full_name}</div>
                              <div className="text-xs text-slate-400">{reg.iid}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{reg.course_code}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{reg.course_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            reg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                            reg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {reg.registration_date ? new Date(reg.registration_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No recent registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-blue-600 text-white border-none">
            <h3 className="font-bold text-lg mb-2">Academic Calendar</h3>
            <p className="text-blue-100 text-sm mb-6">Important dates for the current semester.</p>
            <div className="space-y-4">
              {calendarEvents.length > 0 ? calendarEvents.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="bg-blue-500/50 px-2 py-1 rounded text-xs font-bold w-14 text-center">
                    {item.date}
                  </div>
                  <div className="text-sm font-medium">{item.event}</div>
                </div>
              )) : (
                <p className="text-blue-100 text-xs italic">No upcoming events scheduled.</p>
              )}
            </div>
            <button className="w-full mt-6 py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
              View Full Calendar
            </button>
          </div>

          <div className="card">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-lg">System Notifications</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { title: 'Backup Successful', time: '2 hours ago', type: 'success' },
                { title: 'New Lecturer Assigned', time: '5 hours ago', type: 'info' },
                { title: 'Registration Deadline', time: '1 day ago', type: 'warning' },
              ].map((notif, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    notif.type === 'success' ? 'bg-emerald-500' : 
                    notif.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{notif.title}</div>
                    <div className="text-xs text-slate-400">{notif.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleContent = () => {
    if (activeModule === 'dashboard') return renderDashboard();

    const module = filteredNavItems.find(item => item.id === activeModule);
    
    const renderHeader = () => (
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{module?.label}</h1>
          <p className="text-slate-500">Manage your {module?.label.toLowerCase()} settings and data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary gap-2">
            <FileSpreadsheet size={18} />
            Export
          </button>
        </div>
      </div>
    );

    const renderTabs = () => (
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar mb-6">
        {module?.subItems?.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setActiveSubItem(sub.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeSubItem === sub.id || (!activeSubItem && module.subItems?.[0].id === sub.id)
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>
    );

    let content;
    switch (activeModule) {
      case 'student_portal':
        content = <StudentPortalModule activeSubItem={activeSubItem} />;
        break;
      case 'students':
        content = <StudentsModule activeSubItem={activeSubItem} />;
        break;
      case 'programs':
        content = <ProgramsModule activeSubItem={activeSubItem} onSubItemChange={setActiveSubItem} />;
        break;
      case 'courses':
        content = <CoursesModule activeSubItem={activeSubItem} />;
        break;
      case 'registration':
        content = <RegistrationModule activeSubItem={activeSubItem} />;
        break;
      case 'assessment':
        content = <AssessmentModule activeSubItem={activeSubItem} user={user} />;
        break;
      case 'lecturers':
        content = <LecturersModule activeSubItem={activeSubItem} onSubItemChange={setActiveSubItem} />;
        break;
      case 'settings':
        content = <SettingsModule activeSubItem={activeSubItem} user={user} />;
        break;
      case 'academic_records':
        content = <AcademicRecordsModule activeSubItem={activeSubItem} />;
        break;
      case 'statistics':
        content = <StatisticsModule activeSubItem={activeSubItem} />;
        break;
      default:
        content = (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              {module?.icon && React.cloneElement(module.icon as React.ReactElement, { size: 48, className: 'text-slate-300' })}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {activeSubItem 
                ? module?.subItems?.find(s => s.id === activeSubItem)?.label 
                : module?.subItems?.[0].label}
            </h3>
            <p className="text-slate-500 max-w-md mt-2">
              This module is currently being populated with the modern UI components. 
              All functionalities from the original SIMS will be available here.
            </p>
            <button className="mt-6 btn btn-primary">
              Initialize Module
            </button>
          </div>
        );
    }

    return (
      <div className="space-y-0">
        {renderHeader()}
        {renderTabs()}
        {content}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth <= 1024 && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-400 transition-all duration-300 ease-in-out border-r border-slate-800 ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-900/20">
            S
          </div>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3 flex flex-col"
            >
              <span className="text-white font-bold text-lg tracking-tight leading-none">SIMS</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">St. Nicholas</span>
            </motion.div>
          )}
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-160px)] no-scrollbar">
          {filteredNavItems.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const isActive = activeModule === item.id;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    handleNavClick(item.id, !!item.subItems);
                    if (!item.subItems && window.innerWidth <= 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all group ${
                    isActive && !item.subItems
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className={`${isActive && !item.subItems ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <>
                      <span className="ml-3 font-medium text-sm flex-1 text-left">{item.label}</span>
                      {item.subItems && (
                        isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                      )}
                    </>
                  )}
                </button>

                {isSidebarOpen && item.subItems && isExpanded && (
                  <div className="ml-9 space-y-1 border-l border-slate-800 pl-2">
                    {item.subItems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setActiveModule(item.id);
                          setActiveSubItem(sub.id);
                          if (window.innerWidth <= 1024) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all ${
                          activeModule === item.id && activeSubItem === sub.id
                            ? 'text-blue-400 bg-blue-400/10'
                            : 'text-slate-500 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all group"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 transition-all duration-300 min-w-0 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-[10px]">S</div>
              <span className="font-bold text-slate-900 text-sm">SIMS</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-64">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search students, courses..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-4 relative">
              <div className="relative">
                <button 
                  onClick={() => {
                    const nextState = !showNotifications;
                    setShowNotifications(nextState);
                    if (nextState) {
                      loadNotifications();
                    }
                  }}
                  className={`relative p-2 rounded-lg transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Bell size={20} />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">
                      {Math.min(unreadNotifications.length, 9)}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                            {unreadNotifications.length} New
                          </span>
                          {notifications.length > 0 && (
                            <button
                              onClick={async () => {
                                await api.markAllNotificationsRead();
                                setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
                              }}
                              className="text-[10px] font-bold text-slate-500 hover:text-blue-600"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                        {notifications.length > 0 ? notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-xl transition-colors cursor-pointer group ${
                              notif.is_read ? 'hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                notif.type.includes('bulk') ? 'bg-emerald-500' : 
                                notif.type.includes('request') ? 'bg-orange-500' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{notif.title}</div>
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(notif.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="p-8 text-center text-sm text-slate-400">No notifications yet.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2" />

              <div className="relative">
                <button 
                  onClick={() => setShowProfilePopover(!showProfilePopover)}
                  className={`flex items-center gap-2 md:gap-3 p-1 rounded-xl transition-all ${showProfilePopover ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="text-right hidden sm:block px-1">
                    <div className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{user.name}</div>
                    <div className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  <img 
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                    alt="Profile" 
                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl border-2 border-white shadow-sm"
                  />
                </button>

                {showProfilePopover && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfilePopover(false)} />
                    <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
                        <div className="relative inline-block">
                          <img 
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg mx-auto"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-lg border-4 border-white shadow-sm flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          </div>
                        </div>
                        <h3 className="mt-4 font-bold text-slate-900 text-lg">{user.name}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">{user.email || user.username}</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <UserIcon size={12} />
                          {user.role.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="p-2">
                        <button onClick={handleOpenProfile} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-medium">
                          <UserIcon className="text-slate-400" size={18} />
                          My Profile
                        </button>
                        <button onClick={handleOpenAccountSettings} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-medium">
                          <Settings className="text-slate-400" size={18} />
                          Account Settings
                        </button>
                        <div className="my-2 border-t border-slate-50 mx-2" />
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
                        >
                          <LogOut className="text-red-400" size={18} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule + (activeSubItem || '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderModuleContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
