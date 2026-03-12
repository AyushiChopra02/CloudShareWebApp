import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { UserButton, useUser, useClerk } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  CreditCard,
  Receipt,
  Menu,
  X,
  Cloud,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Timer,
} from "lucide-react";
import { toast } from "react-toastify";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/myfiles", label: "My Files", icon: FolderOpen },
  { path: "/subscription", label: "Subscription", icon: CreditCard },
  { path: "/transaction", label: "Transactions", icon: Receipt },
];


const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 2 * 60 * 1000;   // warn 2 min before

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // const [darkMode, setDarkMode] = useState(() => {
  //   return localStorage.getItem('theme') === 'dark';
  // });
  const [darkMode, setDarkMode] = useState(() => {
  const savedTheme = localStorage.getItem("theme");
  return savedTheme ? savedTheme === "dark" : false;
});
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  // ─── Session Inactivity Timeout ────────────────────────
  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const resetTimer = useCallback(() => {
    setShowTimeoutWarning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Show warning before timeout
    warningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      toast.warn("Session expiring soon due to inactivity!", { autoClose: false, toastId: "session-warn" });
    }, SESSION_TIMEOUT - WARNING_BEFORE);

    // Auto logout on timeout
    timeoutRef.current = setTimeout(() => {
      toast.dismiss("session-warn");
      toast.info("Session timed out due to inactivity.");
      handleLogout();
    }, SESSION_TIMEOUT);
  }, [handleLogout]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const handler = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // start initial timer

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);

  // // ─── Dark Mode ─────────────────────────────────────────
  // useEffect(() => {
  //   const root = window.document.documentElement;
  //   if (darkMode) {
  //     root.classList.add('dark');
  //     localStorage.setItem('theme', 'dark');
  //   } else {
  //     root.classList.remove('dark');
  //     localStorage.setItem('theme', 'light');
  //   }
  // }, [darkMode]);
  useEffect(() => {
  const root = document.documentElement;

  if (darkMode) {
    root.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}, [darkMode]);

  const handleToggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    // <div className="flex h-screen bg-linear-to-br from-gray-50 via-white to-purple-50/30 dark:from-[#18181b] dark:via-[#1e1e2e] dark:to-[#1e1e2e]">
    <div className="flex h-screen bg-gray-50 dark:bg-[#18181b] transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${sidebarCollapsed ? 'w-16' : 'w-67.5'} bg-white/80 dark:bg-[#1e1e2e]/95 backdrop-blur-xl border-r border-gray-200/60 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-xl lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center justify-between h-16 ${sidebarCollapsed ? 'px-3' : 'px-6'} border-b border-gray-100`}>
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200 group-hover:shadow-purple-300 transition-shadow shrink-0">
              <Cloud className="w-4.5 h-4.5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-bold bg-linear-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
                CloudShare
              </span>
            )}
          </NavLink>
          <div className="flex items-center gap-1">
            <button
              className="hidden lg:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              onClick={() => setSidebarCollapsed(prev => !prev)}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-4 mb-3 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
              Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center ${sidebarCollapsed ? 'justify-center' : ''} gap-3 ${sidebarCollapsed ? 'px-2' : 'px-4'} py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200/50"
                    : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={isActive ? "text-white" : "text-gray-400 group-hover:text-purple-500 transition-colors"} />
                  {!sidebarCollapsed && item.label}
                  {!sidebarCollapsed && isActive && (
                    <Sparkles size={12} className="ml-auto text-purple-200" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={`${sidebarCollapsed ? 'px-2' : 'px-4'} py-4 border-t border-gray-100 bg-gray-50/50 dark:bg-[#1a1a2e] space-y-3`}>
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2">
                <UserButton afterSignOutUrl="/" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-950 dark:text-white truncate">
                    {user?.firstName || "User"}
                  </p>
                  <p className="text-[11px] font-medium text-gray-800 dark:text-gray-300 truncate">
                    {user?.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleTheme}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-all duration-200"
              >
                {/* {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'} */}
                {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-all duration-200"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-16 px-4 sm:px-6 bg-white/70 dark:bg-[#1e1e2e]/70 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-20">
          <button
            className="lg:hidden mr-4 text-gray-400 hover:text-gray-700 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
              Welcome,{" "}
              <span className="font-semibold text-gray-800 dark:text-white">
                {user?.firstName || "User"}
              </span>
              <span className="text-lg">👋</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-200"
              title="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        {/* <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 dark:bg-[#18181b]"> */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-[#18181b] transition-colors duration-300">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
