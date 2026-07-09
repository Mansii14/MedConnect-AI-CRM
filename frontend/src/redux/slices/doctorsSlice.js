import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
  currentDoctor: null,
  loading: false,
  error: null,
};

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    fetchDoctorsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDoctorsSuccess: (state, action) => {
      state.loading = false;
      state.list = action.payload;
    },
    fetchDoctorsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchDoctorDetailSuccess: (state, action) => {
      state.loading = false;
      state.currentDoctor = action.payload;
    },
    addDoctorSuccess: (state, action) => {
      state.list.unshift(action.payload);
    },
    updateDoctorSuccess: (state, action) => {
      state.list = state.list.map((doc) =>
        doc.id === action.payload.id ? action.payload : doc
      );
      if (state.currentDoctor && state.currentDoctor.id === action.payload.id) {
        state.currentDoctor = { ...state.currentDoctor, ...action.payload };
      }
    },
    deleteDoctorSuccess: (state, action) => {
      state.list = state.list.filter((doc) => doc.id !== action.payload);
      if (state.currentDoctor && state.currentDoctor.id === action.payload) {
        state.currentDoctor = null;
      }
    },
  },
});

export const {
  fetchDoctorsStart,
  fetchDoctorsSuccess,
  fetchDoctorsFailure,
  fetchDoctorDetailSuccess,
  addDoctorSuccess,
  updateDoctorSuccess,
  deleteDoctorSuccess,
} = doctorsSlice.actions;

export default doctorsSlice.reducer;
