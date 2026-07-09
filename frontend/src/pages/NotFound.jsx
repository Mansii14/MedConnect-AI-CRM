import React from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mb-6">
        <HeartPulse className="w-6 h-6" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">404</h1>
      <p className="mt-2 text-base text-slate-500 dark:text-slate-400">Page not found</p>
      <div className="mt-6">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 transition-all"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
