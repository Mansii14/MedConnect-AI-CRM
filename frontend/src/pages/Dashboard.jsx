import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardStart, fetchDashboardSuccess, fetchDashboardFailure } from '../redux/slices/dashboardSlice';
import api from '../services/api';
import {
  Users,
  Calendar,
  CheckSquare,
  TrendingUp,
  PlusCircle,
  Stethoscope,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { stats, todayInteractions, upcomingFollowups, loading } = useSelector((state) => state.dashboard);

  useEffect(() => {
    const fetchDashboardData = async () => {
      dispatch(fetchDashboardStart());
      try {
        // Fetch all doctors, interactions, and followups
        const [docsRes, intersRes, fupRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/interactions'),
          api.get('/followup'),
        ]);

        const doctors = docsRes.data;
        const interactions = intersRes.data;
        const followups = fupRes.data;

        // Calculations
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const todayVisits = interactions.filter((i) => i.visit_date === todayStr);
        const pendingFup = followups.filter((f) => f.status === 'PENDING');
        const monthlyVisits = interactions.filter((i) => {
          const vDate = new Date(i.visit_date);
          return vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;
        });

        // Compute specialization distribution for Chart
        const specMap = {};
        interactions.forEach((inter) => {
          const spec = inter.doctor?.specialization || 'Other';
          specMap[spec] = (specMap[spec] || 0) + 1;
        });
        const chartData = Object.keys(specMap).map((key) => ({
          name: key,
          visits: specMap[key],
        }));

        dispatch(
          fetchDashboardSuccess({
            stats: {
              totalDoctors: doctors.length,
              totalVisits: interactions.length,
              followupsPending: pendingFup.length,
              interactionsThisMonth: monthlyVisits.length,
            },
            todayInteractions: todayVisits,
            upcomingFollowups: pendingFup.slice(0, 5), // show top 5 upcoming
          })
        );
      } catch (err) {
        dispatch(fetchDashboardFailure(err.message || 'Failed to fetch dashboard.'));
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

  const statCards = [
    {
      title: 'Total Doctors',
      value: stats.totalDoctors,
      icon: <Users className="w-6 h-6 text-emerald-500" />,
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Visits Logged',
      value: stats.totalVisits,
      icon: <Calendar className="w-6 h-6 text-blue-500" />,
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Follow-ups Pending',
      value: stats.followupsPending,
      icon: <CheckSquare className="w-6 h-6 text-amber-500" />,
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Interactions This Month',
      value: stats.interactionsThisMonth,
      icon: <TrendingUp className="w-6 h-6 text-indigo-500" />,
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Overview Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics and follow-up activities.
          </p>
        </div>
        <Link
          to="/log-interaction"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Log New Interaction
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white">
                {card.value}
              </h3>
            </div>
            <div className={`p-4 rounded-xl border ${card.bg}`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Today's Visits & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Interactions */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Today's Scheduled Interactions
            </h3>
            {todayInteractions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                No interactions logged today yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayInteractions.map((inter) => (
                  <div key={inter.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                          Dr. {inter.doctor?.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {inter.doctor?.hospital} • {inter.doctor?.specialization}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {inter.visit_time.substring(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visits by Specialization Chart */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Interactions by Doctor Specialization
            </h3>
            <div className="h-64">
              {stats.totalVisits === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No data to display. Log some visits first!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.totalVisits ? stats.totalVisits : [] /* placeholder fallback handled below */}>
                    {/* Recharts configuration */}
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Upcoming Follow-ups */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Upcoming Follow-ups
            </h3>
            <Link
              to="/followups"
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              See all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingFollowups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              All caught up! No pending follow-ups.
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingFollowups.map((fup) => (
                <div
                  key={fup.id}
                  className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/20 dark:hover:border-emerald-500/20 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      Dr. {fup.interaction?.doctor?.name || 'Doctor'}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 uppercase">
                      {fup.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {fup.notes || 'No follow-up notes.'}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {fup.follow_up_date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
