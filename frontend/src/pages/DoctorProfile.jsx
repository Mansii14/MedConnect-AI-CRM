import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import {
  User,
  MapPin,
  Stethoscope,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowLeft,
  Pill,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function DoctorProfile() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [docRes, intersRes] = await Promise.all([
          api.get(`/doctors/${id}`),
          api.get('/interactions', { params: { doctor_id: id } }),
        ]);
        setDoctor(docRes.data);
        setInteractions(intersRes.data);
        setError(null);
      } catch (err) {
        setError('Failed to load doctor profile. Make sure the doctor exists.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [id]);

  // Aggregate medicines discussed
  const getUniqueMedicines = () => {
    const medsSet = new Set();
    interactions.forEach((inter) => {
      if (inter.medicines) {
        // Split by commas, semicolons or newlines
        inter.medicines.split(/[,;\n]+/).forEach((med) => {
          const trimmed = med.trim();
          if (trimmed) medsSet.add(trimmed);
        });
      }
    });
    return Array.from(medsSet);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <p className="text-rose-500 font-semibold mb-4">{error || 'Doctor not found.'}</p>
        <Link to="/doctors" className="inline-flex items-center gap-2 text-emerald-500 font-bold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Doctors
        </Link>
      </div>
    );
  }

  const uniqueMeds = getUniqueMedicines();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Doctors List
        </Link>
      </div>

      {/* Profile Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-2xl font-bold">
            {doctor.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-850 dark:text-white">
              Dr. {doctor.name}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {doctor.hospital}
            </p>
          </div>
        </div>

        {/* Contact Quick Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Specialization
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
              {doctor.specialization}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              City
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {doctor.city}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Phone
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {doctor.phone || 'N/A'}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Email
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350 truncate max-w-[120px]">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {doctor.email || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Timeline and Sidebar details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Timeline of Visits */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-6">
              Interaction Timeline
            </h3>

            {interactions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                No visits logged with Dr. {doctor.name} yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-8">
                {interactions.map((inter) => (
                  <div key={inter.id} className="relative group">
                    {/* Circle Node indicator */}
                    <span className="absolute -left-[31px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-950/20 group-hover:scale-110 transition-transform"></span>

                    <div className="space-y-3">
                      {/* DateTime & Type */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5" />
                          {inter.visit_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {inter.visit_time.substring(0, 5)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">
                          {inter.interaction_type}
                        </span>
                        {inter.priority && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inter.priority === 'High'
                                ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                                : inter.priority === 'Medium'
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {inter.priority} Priority
                          </span>
                        )}
                      </div>

                      {/* Summary Section */}
                      {inter.summary && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl">
                          <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 italic leading-relaxed">
                            {inter.summary}
                          </p>
                        </div>
                      )}

                      {/* Discussion Details */}
                      <div className="space-y-1.5">
                        <h5 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          Discussion Details
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {inter.discussion}
                        </p>
                      </div>

                      {/* Feedback & Medicines Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {inter.medicines && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Medicines Discussed
                            </span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {inter.medicines}
                            </p>
                          </div>
                        )}
                        {inter.feedback && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Doctor Feedback
                            </span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {inter.feedback}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Note */}
                      {inter.follow_up_date && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Follow-up Scheduled: {inter.follow_up_date}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Medicines Aggregation & Follow-up schedules */}
        <div className="space-y-6">
          {/* Medicines Summary */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-855 dark:text-white mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-500" />
              Medicines Discussed
            </h3>
            {uniqueMeds.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                No medicines logged in discussions yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {uniqueMeds.map((med, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
                  >
                    {med}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Follow-up Schedule list for this Doctor */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-base font-bold text-slate-855 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Follow-up Schedule
            </h3>
            {interactions.filter((i) => i.follow_up_date).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                No follow-ups scheduled.
              </p>
            ) : (
              <div className="space-y-3">
                {interactions
                  .filter((i) => i.follow_up_date)
                  .map((inter) => (
                    <div
                      key={inter.id}
                      className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1 hover:border-indigo-500/20 transition-all"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {inter.follow_up_date}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          PENDING
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Feedback required for discussion on {inter.visit_date}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
