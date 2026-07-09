import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchInteractionsStart,
  fetchInteractionsSuccess,
  fetchInteractionsFailure,
  deleteInteractionSuccess,
} from '../redux/slices/interactionsSlice';
import { addToast } from '../redux/slices/notificationsSlice';
import api from '../services/api';
import { Search, Download, Trash2, Calendar, Eye, Filter, ArrowLeft, ArrowRight, X } from 'lucide-react';

export default function InteractionHistory() {
  const dispatch = useDispatch();
  const { list: interactions, loading } = useSelector((state) => state.interactions);

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Local pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadHistory = async () => {
    dispatch(fetchInteractionsStart());
    try {
      const res = await api.get('/interactions');
      dispatch(fetchInteractionsSuccess(res.data));
    } catch (err) {
      dispatch(fetchInteractionsFailure(err.message));
      dispatch(addToast({ type: 'error', message: 'Failed to fetch interactions.' }));
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interaction log? This cannot be undone.')) return;
    try {
      await api.delete(`/interactions/${id}`);
      dispatch(deleteInteractionSuccess(id));
      dispatch(addToast({ type: 'success', message: 'Interaction log deleted.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to delete interaction.' }));
    }
  };

  // Filter & Search Logic
  const filteredInteractions = interactions.filter((item) => {
    const docName = item.doctor?.name || '';
    const hosp = item.doctor?.hospital || '';
    const notes = item.discussion || '';
    const sum = item.summary || '';
    const matchSearch =
      docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hosp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchPriority = priorityFilter === '' || item.priority === priorityFilter;
    const matchType = typeFilter === '' || item.interaction_type === typeFilter;

    return matchSearch && matchPriority && matchType;
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInteractions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInteractions.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredInteractions.length === 0) {
      dispatch(addToast({ type: 'warning', message: 'No records available to export.' }));
      return;
    }

    const headers = ['Interaction ID', 'Doctor Name', 'Hospital', 'Visit Date', 'Visit Time', 'Interaction Type', 'Discussion Notes', 'Medicines Discussed', 'Doctor Feedback', 'AI Summary', 'Priority'];
    const rows = filteredInteractions.map((item) => [
      item.id,
      item.doctor?.name || 'N/A',
      item.doctor?.hospital || 'N/A',
      item.visit_date,
      item.visit_time,
      item.interaction_type,
      `"${item.discussion.replace(/"/g, '""')}"`,
      `"${(item.medicines || '').replace(/"/g, '""')}"`,
      `"${(item.feedback || '').replace(/"/g, '""')}"`,
      `"${(item.summary || '').replace(/"/g, '""')}"`,
      item.priority,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HCP_Interactions_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    dispatch(addToast({ type: 'success', message: 'CSV Export started successfully!' }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search and filter panel */}
      <div className="flex flex-col gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by doctor, hospital, notes or summary..."
              className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-705 dark:text-white outline-none transition-all text-sm"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-705 dark:text-white outline-none transition-all text-sm"
            >
              <option value="">All Types</option>
              <option value="In-Person">In-Person</option>
              <option value="Video Call">Video Call</option>
              <option value="Phone Call">Phone Call</option>
              <option value="Email">Email</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-650 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all hover:border-emerald-500/30"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {(searchTerm || priorityFilter || typeFilter) && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-850">
            <span className="text-xs text-slate-500 dark:text-slate-450 font-medium">
              Found {filteredInteractions.length} matching interaction records
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading && interactions.length === 0 ? (
          <div className="p-12 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-50 dark:bg-slate-850 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            No interaction logs match your search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    Hospital
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    Visit Date
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    AI Summary
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all"
                  >
                    <td className="px-6 py-4.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4.5">
                      <Link
                        to={`/doctors/${item.doctor_id}`}
                        className="text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-500 transition-colors"
                      >
                        Dr. {item.doctor?.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-655 dark:text-slate-400">
                      {item.doctor?.hospital || 'N/A'}
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-655 dark:text-slate-400 font-medium">
                      {item.visit_date}
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-600 dark:text-slate-350 max-w-xs truncate italic">
                      {item.summary || item.discussion || 'No summary'}
                    </td>
                    <td className="px-6 py-4.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.priority === 'High'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                            : item.priority === 'Medium'
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right space-x-2">
                      <Link
                        to={`/doctors/${item.doctor_id}`}
                        className="inline-flex p-2 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex p-2 rounded-lg border border-slate-150 dark:border-slate-800 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500 dark:text-slate-450 font-medium">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:text-slate-500 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 disabled:hover:text-slate-500 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
