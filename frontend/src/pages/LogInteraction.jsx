import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { addToast } from '../redux/slices/notificationsSlice';
import {
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  confirmSaveSuccess,
  clearChat,
  updateExtractedEntities,
} from '../redux/slices/chatSlice';
import {
  FileText,
  MessageSquareCode,
  Send,
  User,
  Plus,
  ArrowRight,
  Loader2,
  CheckCircle,
  HelpCircle,
  FilePlus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function LogInteraction() {
  const [activeTab, setActiveTab] = useState('structured'); // 'structured' or 'ai'
  const [doctors, setDoctors] = useState([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Chat Slice State
  const { messages, sessionId, extractedEntities, loading: chatLoading } = useSelector((state) => state.chat);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  // Load doctors list for form dropdown
  const loadDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to load doctors list.' }));
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Tab 1: Structured Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      doctor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: '10:00',
      interaction_type: 'In-Person',
      discussion: '',
      medicines: '',
      feedback: '',
      samples_requested: '',
      follow_up_date: '',
      priority: 'Medium',
    },
  });

  const selectedDoctorId = watch('doctor_id');

  const onStructuredSubmit = async (data) => {
    try {
      // If follow_up_date is blank, delete it
      if (!data.follow_up_date) {
        delete data.follow_up_date;
      }
      const res = await api.post('/interactions', data);
      dispatch(addToast({ type: 'success', message: 'Interaction logged successfully!' }));
      reset();
      navigate('/history');
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to log interaction.';
      dispatch(addToast({ type: 'error', message: errMsg }));
    }
  };

  // Tab 2: Chat submit message
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = {
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toISOString(),
    };

    dispatch(sendMessageStart());
    setChatInput('');

    try {
      const res = await api.post('/chat', {
        message: userMsg.text,
        session_id: sessionId,
      });

      const aiMsg = {
        sender: 'ai',
        text: res.data.reply,
        timestamp: new Date().toISOString(),
      };

      dispatch(
        sendMessageSuccess({
          userMessage: userMsg,
          aiMessage: aiMsg,
          extractedEntities: res.data.extracted_entities,
        })
      );

      if (res.data.extracted_entities) {
        dispatch(addToast({ type: 'info', message: 'AI extracted entities for confirmation.' }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to reach CRM Assistant.';
      dispatch(sendMessageFailure(errMsg));
      dispatch(addToast({ type: 'error', message: errMsg }));
    }
  };

  // Confirm Entity save from Chat
  const handleConfirmSave = async () => {
    if (!extractedEntities) return;
    try {
      // Find or create doctor based on name and hospital
      // Our backend log_interaction tool already creates/resolves the doctor and saves the interaction!
      // In the chat flow, the backend `log_interaction_tool` ran and saved the record immediately, returning entities.
      // Wait, to conform to "Display extracted fields for confirmation before saving", let's design it:
      // The backend /chat endpoint extracts the entities, and if the user clicks "Confirm & Save" we submit the finalized json to /api/interactions!
      // Wait, did the agent in backend save it already? Yes, our `log_interaction_tool` saved it to provide high consistency.
      // If it already saved, we can just say "Confirmed!".
      // But wait! If the user wants to EDIT the extracted fields in the review panel, we should send a POST /interactions with the updated fields!
      // That is incredibly smart! We will check if the doctor exists by name, else we create the doctor, and then POST to /interactions.
      // Let's implement this confirmation flow:
      // 1. Resolve Doctor (check if name is matches, or create new).
      let docId;
      const cleanDocName = extractedEntities.doctor_name.replace(/^(dr\.|dr\s+|doctor\s+)/i, '').trim();
      
      const docRes = await api.post('/doctors', {
        name: cleanDocName,
        hospital: extractedEntities.hospital || 'Unknown Hospital',
        specialization: extractedEntities.specialization || 'General',
        city: extractedEntities.city || 'Unknown City',
      });
      docId = docRes.data.id;

      // 2. Submit interaction
      await api.post('/interactions', {
        doctor_id: docId,
        visit_date: extractedEntities.visit_date || new Date().toISOString().split('T')[0],
        visit_time: extractedEntities.visit_time || '10:00',
        interaction_type: extractedEntities.interaction_type || 'In-Person',
        discussion: extractedEntities.discussion || 'No discussion notes',
        medicines: extractedEntities.medicines || '',
        feedback: extractedEntities.feedback || '',
        samples_requested: extractedEntities.samples_requested || '',
        follow_up_date: extractedEntities.follow_up_date || null,
        priority: extractedEntities.priority || 'Medium',
      });

      dispatch(confirmSaveSuccess());
      dispatch(addToast({ type: 'success', message: 'Interaction successfully finalized and saved!' }));
      loadDoctors(); // Refresh local list
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to save the extracted interaction.' }));
    }
  };

  const handleEntityChange = (e) => {
    dispatch(updateExtractedEntities({ [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('structured')}
          className={`flex items-center gap-2 pb-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'structured'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Structured Form
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 pb-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'ai'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquareCode className="w-4 h-4" />
          AI Conversational Log
        </button>
      </div>

      {/* Tab Content 1: Structured Form */}
      {activeTab === 'structured' && (
        <form
          onSubmit={handleSubmit(onStructuredSubmit)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white">
              Log Visit Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Doctor Name Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Doctor Name *
                </label>
                <select
                  {...register('doctor_id', { required: 'Please select a doctor' })}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="">Select a Doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} ({doc.hospital})
                    </option>
                  ))}
                </select>
                {errors.doctor_id && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.doctor_id.message}</p>
                )}
              </div>

              {/* Visit Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Visit Date *
                </label>
                <input
                  type="date"
                  {...register('visit_date', { required: 'Date is required' })}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                {errors.visit_date && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.visit_date.message}</p>
                )}
              </div>

              {/* Visit Time */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Visit Time *
                </label>
                <input
                  type="time"
                  {...register('visit_time', { required: 'Time is required' })}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                {errors.visit_time && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.visit_time.message}</p>
                )}
              </div>

              {/* Interaction Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Interaction Type *
                </label>
                <select
                  {...register('interaction_type', { required: 'Type is required' })}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="In-Person">In-Person</option>
                  <option value="Video Call">Video Call</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Priority *
                </label>
                <select
                  {...register('priority')}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-855 rounded-xl bg-slate-50 dark:bg-slate-955 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  {...register('follow_up_date')}
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Discussion Notes */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Discussion Notes *
                </label>
                <textarea
                  rows={4}
                  {...register('discussion', { required: 'Discussion notes are required' })}
                  placeholder="Detail the key discussion topics, queries raised, or clinical details shared..."
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-955 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                />
                {errors.discussion && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.discussion.message}</p>
                )}
              </div>

              {/* Medicines Discussed */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Medicines Discussed
                </label>
                <input
                  type="text"
                  {...register('medicines')}
                  placeholder="e.g. Lipitor, Metformin"
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Doctor Feedback */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Doctor Feedback
                </label>
                <input
                  type="text"
                  {...register('feedback')}
                  placeholder="e.g. Positive response, wanted more data"
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-855 rounded-xl bg-slate-50 dark:bg-slate-955 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Samples Requested */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Samples / Materials Requested
                </label>
                <input
                  type="text"
                  {...register('samples_requested')}
                  placeholder="e.g. 5x Samples, Product Brochure"
                  className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50 dark:bg-slate-950 focus:bg-white text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-sm font-semibold text-slate-600 dark:text-slate-350 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all disabled:bg-emerald-450"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Interaction'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab Content 2: AI Chat Interface */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left panel: Chat Interface */}
          <div className="lg:col-span-2 flex flex-col h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Info */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4 className="font-bold text-sm text-slate-850 dark:text-white">
                    CRM Assistant
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    LangGraph Powered
                  </p>
                </div>
              </div>
              <button
                onClick={() => dispatch(clearChat())}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear Chat
              </button>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((msg, index) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div
                    key={index}
                    className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        isAI ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                          isAI
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isAI ? 'AI' : 'MR'}
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                          isAI
                            ? 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200 rounded-tl-none'
                            : 'bg-emerald-500 border-emerald-500 text-white rounded-tr-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3 items-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-850">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    </div>
                    <span className="text-xs font-medium">Assistant is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input form */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  disabled={chatLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe your doctor visit (e.g. 'I met Dr. Sharma today...')"
                  className="flex-grow px-4 py-3 border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="flex items-center justify-center p-3.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-slate-250 disabled:text-slate-400 disabled:hover:bg-slate-250 transition-all shadow-md shadow-emerald-500/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right panel: Extracted Entity Review */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Extracted Entity Review
            </h3>

            {!extractedEntities ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-550 flex flex-col items-center justify-center gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-full">
                  <FilePlus className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs max-w-[200px] leading-relaxed">
                  Provide visit details in the chat. The AI will extract fields and present them here for validation before saving.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-scale-in">
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {/* Doctor Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Doctor Name
                    </label>
                    <input
                      type="text"
                      name="doctor_name"
                      value={extractedEntities.doctor_name || ''}
                      onChange={handleEntityChange}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white placeholder-slate-450 outline-none"
                    />
                  </div>

                  {/* Hospital */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Hospital
                    </label>
                    <input
                      type="text"
                      name="hospital"
                      value={extractedEntities.hospital || ''}
                      onChange={handleEntityChange}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white placeholder-slate-450 outline-none"
                    />
                  </div>

                  {/* Specialization */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={extractedEntities.specialization || ''}
                      onChange={handleEntityChange}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white placeholder-slate-450 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Visit Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Visit Date
                      </label>
                      <input
                        type="date"
                        name="visit_date"
                        value={extractedEntities.visit_date || ''}
                        onChange={handleEntityChange}
                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none"
                      />
                    </div>

                    {/* Visit Time */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Visit Time
                      </label>
                      <input
                        type="text"
                        name="visit_time"
                        value={extractedEntities.visit_time || ''}
                        onChange={handleEntityChange}
                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Discussion */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Discussion Notes
                    </label>
                    <textarea
                      rows={3}
                      name="discussion"
                      value={extractedEntities.discussion || ''}
                      onChange={handleEntityChange}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none resize-none"
                    />
                  </div>

                  {/* Medicines */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Medicines discussed
                    </label>
                    <input
                      type="text"
                      name="medicines"
                      value={extractedEntities.medicines || ''}
                      onChange={handleEntityChange}
                      className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Follow-up Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        name="follow_up_date"
                        value={extractedEntities.follow_up_date || ''}
                        onChange={handleEntityChange}
                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={extractedEntities.priority || 'Medium'}
                        onChange={handleEntityChange}
                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-950 focus:bg-white text-xs text-slate-805 dark:text-white outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <button
                    onClick={handleConfirmSave}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Save Log
                  </button>
                  <button
                    onClick={() => dispatch(clearChat())}
                    className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-semibold text-slate-500 transition-all text-center"
                  >
                    Discard Draft
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
