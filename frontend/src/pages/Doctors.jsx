import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchDoctorsStart,
  fetchDoctorsSuccess,
  fetchDoctorsFailure,
  addDoctorSuccess,
  updateDoctorSuccess,
} from '../redux/slices/doctorsSlice';
import { addToast } from '../redux/slices/notificationsSlice';
import api from '../services/api';
import { Search, Plus, MapPin, Stethoscope, Phone, Mail, Edit, User, X } from 'lucide-react';

export default function Doctors() {
  const dispatch = useDispatch();
  const { list: doctors, loading } = useSelector((state) => state.doctors);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    hospital: '',
    specialization: '',
    city: '',
    phone: '',
    email: '',
  });

  const fetchDoctorsList = async (query = '') => {
    dispatch(fetchDoctorsStart());
    try {
      const res = await api.get('/doctors', { params: { search: query } });
      dispatch(fetchDoctorsSuccess(res.data));
    } catch (err) {
      dispatch(fetchDoctorsFailure(err.message));
      dispatch(addToast({ type: 'error', message: 'Failed to fetch doctor list.' }));
    }
  };

  useEffect(() => {
    fetchDoctorsList(searchTerm);
  }, [searchTerm]);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setForm({ name: '', hospital: '', specialization: '', city: '', phone: '', email: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (doc, e) => {
    e.preventDefault(); // stop click event propagation to Link parent
    setEditingDoctor(doc);
    setForm({
      name: doc.name,
      hospital: doc.hospital,
      specialization: doc.specialization,
      city: doc.city,
      phone: doc.phone || '',
      email: doc.email || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        // Edit API call
        const res = await api.put(`/doctors/${editingDoctor.id}`, form);
        dispatch(updateDoctorSuccess(res.data));
        dispatch(addToast({ type: 'success', message: 'Doctor details updated successfully!' }));
      } else {
        // Add API call
        const res = await api.post('/doctors', form);
        dispatch(addDoctorSuccess(res.data));
        dispatch(addToast({ type: 'success', message: 'New doctor added successfully!' }));
      }
      setShowModal(false);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to save doctor. Check for duplicates.';
      dispatch(addToast({ type: 'error', message: errMsg }));
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name or hospital..."
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
          />
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add HCP Doctor
        </button>
      </div>

      {/* Grid List */}
      {loading && doctors.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500">
          No doctors found. Feel free to register a new Healthcare Professional.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {doctors.map((doc) => (
            <Link
              key={doc.id}
              to={`/doctors/${doc.id}`}
              className="group p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-white group-hover:text-emerald-500 transition-colors">
                        Dr. {doc.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {doc.hospital}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleOpenEdit(doc, e)}
                    className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Stethoscope className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{doc.specialization}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{doc.city}</span>
                  </div>
                  {doc.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{doc.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingDoctor ? 'Edit Doctor Profile' : 'Add New HCP Doctor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Doctor Name (Excl. Dr. prefix)
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Sharma"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Hospital / Clinic Name
                  </label>
                  <input
                    type="text"
                    name="hospital"
                    required
                    value={form.hospital}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Apollo Hospital"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Specialization
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    required
                    value={form.specialization}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="Cardiologist"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={form.city}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="New Delhi"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="+91 9988776655"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all"
                    placeholder="sharma@hospital.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-350 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all"
                >
                  {editingDoctor ? 'Save Changes' : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
