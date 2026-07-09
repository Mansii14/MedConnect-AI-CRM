import { createSlice } from '@reduxjs/toolkit';

const generateSessionId = () => Math.random().toString(36).substring(2, 15);

const initialState = {
  messages: [
    {
      sender: 'ai',
      text: 'Hello! I am your CRM Assistant. Tell me about your doctor visit, for example: "I met Dr. Sharma today at Apollo Hospital. We discussed our new diabetes medicine. He requested brochures and samples. Schedule follow-up next Monday."',
      timestamp: new Date().toISOString(),
    },
  ],
  sessionId: generateSessionId(),
  extractedEntities: null,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    sendMessageStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    sendMessageSuccess: (state, action) => {
      state.loading = false;
      state.messages.push(action.payload.userMessage);
      state.messages.push(action.payload.aiMessage);
      if (action.payload.extractedEntities) {
        state.extractedEntities = action.payload.extractedEntities;
      }
    },
    sendMessageFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    confirmSaveSuccess: (state) => {
      state.extractedEntities = null;
      state.messages.push({
        sender: 'ai',
        text: 'Successfully saved the interaction to the database!',
        timestamp: new Date().toISOString(),
      });
    },
    clearChat: (state) => {
      state.messages = [initialState.messages[0]];
      state.sessionId = generateSessionId();
      state.extractedEntities = null;
    },
    updateExtractedEntities: (state, action) => {
      state.extractedEntities = { ...state.extractedEntities, ...action.payload };
    },
  },
});

export const {
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  confirmSaveSuccess,
  clearChat,
  updateExtractedEntities,
} = chatSlice.actions;

export default chatSlice.reducer;
