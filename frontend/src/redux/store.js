import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import doctorsReducer from './slices/doctorsSlice';
import interactionsReducer from './slices/interactionsSlice';
import dashboardReducer from './slices/dashboardSlice';
import chatReducer from './slices/chatSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    doctors: doctorsReducer,
    interactions: interactionsReducer,
    dashboard: dashboardReducer,
    chat: chatReducer,
    notifications: notificationsReducer,
  },
});
export default store;
