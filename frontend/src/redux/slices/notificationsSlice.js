import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  toasts: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addToast: (state, action) => {
      state.toasts.push({
        id: Math.random().toString(36).substring(2, 9),
        type: action.payload.type || 'info', // 'success', 'error', 'info', 'warning'
        message: action.payload.message,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = notificationsSlice.actions;
export default notificationsSlice.reducer;
