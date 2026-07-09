import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addToast } from '../redux/slices/notificationsSlice';
import api from '../services/api';
import { Calendar, CheckCircle2, XCircle, Clock, FileText, User } from 'lucide-react';

export default function Followups() {
  const dispatch = useDispatch();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING'); // PENDING, COMPLETED, ALL

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      // API call to fetch followups
      const res = await api.get('/followup');
      setFollowups(res.data);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to fetch followups.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.put(`/followup/${id}`, { status: newStatus });
      dispatch(addToast({ type: 'success', message: `Follow-up marked as ${newStatus.toLowerCase()}!` }));
      fetchFollowups(); // Reload list
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to update follow-up.' }));
    }
  };

  const filteredItems = followups.filter((item) => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-850 dark:text-white">
            Follow-up Activities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your reminders and upcoming schedules.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
          {['PENDING', 'COMPLETED', 'ALL'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Follow-ups */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500">
          No follow-up items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 hover:border-emerald-500/20 dark:hover:border-emerald-500/20 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                        Dr. {item.interaction?.doctor?.name || 'Doctor'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.interaction?.doctor?.hospital}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 uppercase ${
                      item.status === 'PENDING'
                        ? 'text-amber-500 border-amber-200/20'
                        : 'text-emerald-500 border-emerald-200/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    Follow-up Date: {item.follow_up_date}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex gap-2">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    {item.notes || 'No description notes.'}
                  </p>
                </div>
              </div>

              {item.status === 'PENDING' && (
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                    className="flex-grow py-2 px-4 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Completed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'CANCELLED')}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
