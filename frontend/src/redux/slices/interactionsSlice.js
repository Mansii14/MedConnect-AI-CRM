import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
  currentInteraction: null,
  filters: {
    search: '',
    doctorId: '',
    priority: '',
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
  loading: false,
  error: null,
};

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    fetchInteractionsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchInteractionsSuccess: (state, action) => {
      state.loading = false;
      state.list = action.payload;
    },
    fetchInteractionsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    addInteractionSuccess: (state, action) => {
      state.list.unshift(action.payload);
    },
    updateInteractionSuccess: (state, action) => {
      state.list = state.list.map((inter) =>
        inter.id === action.payload.id ? action.payload : inter
      );
    },
    deleteInteractionSuccess: (state, action) => {
      state.list = state.list.filter((inter) => inter.id !== action.payload);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to page 1 on filter change
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
  },
});

export const {
  fetchInteractionsStart,
  fetchInteractionsSuccess,
  fetchInteractionsFailure,
  addInteractionSuccess,
  updateInteractionSuccess,
  deleteInteractionSuccess,
  setFilters,
  resetFilters,
  setPage,
} = interactionsSlice.actions;

export default interactionsSlice.reducer;
