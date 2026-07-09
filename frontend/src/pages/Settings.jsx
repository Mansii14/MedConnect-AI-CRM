import React from 'react';
import { useSelector } from 'react-redux';
import { User, Mail, ShieldAlert, ShieldCheck, Database, Calendar } from 'lucide-react';

export default function Settings() {
  const user = useSelector((state) => state.auth.user);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-white">
            System Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system settings and view user profile metadata.
          </p>
        </div>

        {/* User Info Card */}
        {user && (
          <div className="p-6 border border-slate-100 dark:border-slate-850 rounded-2xl bg-slate-50 dark:bg-slate-950 space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              My Profile
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Name</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Created At</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Settings Info */}
        <div className="space-y-4 pt-4 border-t border-slate-150 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            System Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Database</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">SQLAlchemy SQLite / PG</p>
              </div>
            </div>

            <div className="p-4 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Auth Status</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">JWT Secure</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
