import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stats: {
    totalDoctors: 0,
    totalVisits: 0,
    followupsPending: 0,
    interactionsThisMonth: 0,
  },
  todayInteractions: [],
  upcomingFollowups: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchDashboardStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDashboardSuccess: (state, action) => {
      state.loading = false;
      state.stats = action.payload.stats;
      state.todayInteractions = action.payload.todayInteractions;
      state.upcomingFollowups = action.payload.upcomingFollowups;
    },
    fetchDashboardFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchDashboardStart, fetchDashboardSuccess, fetchDashboardFailure } = dashboardSlice.actions;
export default dashboardSlice.reducer;
