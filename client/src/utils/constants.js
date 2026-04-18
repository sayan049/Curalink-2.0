export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  CHAT: '/chat',
  CHAT_CONVERSATION: '/chat/:id',
  PROFILE: '/profile',
};

export const API_ENDPOINTS = {
  // Auth
  REGISTER_OTP: '/auth/register/request-otp',
  VERIFY_REGISTRATION: '/auth/register/verify-otp',
  LOGIN_OTP: '/auth/login/request-otp',
  VERIFY_LOGIN: '/auth/login/verify-otp',
  GET_ME: '/auth/me',
  UPDATE_PROFILE: '/auth/profile',
  LOGOUT: '/auth/logout',

  // Chat
  CONVERSATIONS: '/chat/conversations',
  CONVERSATION_BY_ID: (id) => `/chat/conversations/${id}`,
  SEND_MESSAGE: (id) => `/chat/conversations/${id}/messages`,

  // Research
  HYBRID_SEARCH: '/research/search',
  PUBMED_SEARCH: '/research/pubmed',
  OPENALEX_SEARCH: '/research/openalex',
  CLINICAL_TRIALS: '/research/clinical-trials',
  TRENDING: '/research/trending',
  STATS: '/research/stats',

  // User
  USER_STATS: '/user/stats',
  USER_ACTIVITY: '/user/activity',
};

export const MEDICAL_SPECIALTIES = [
  'Cardiology',
  'Neurology',
  'Oncology',
  'Endocrinology',
  'Gastroenterology',
  'Pulmonology',
  'Rheumatology',
  'Immunology',
  'Psychiatry',
  'Dermatology',
  'Nephrology',
  'Hematology',
];

export const COMMON_DISEASES = [
  // Cancers
  'Lung Cancer',
  'Breast Cancer',
  'Colorectal Cancer',
  'Prostate Cancer',
  'Leukemia',
  'Lymphoma',
  'Cancer Immunotherapy',
  // Neurological
  "Alzheimer's Disease",
  "Parkinson's Disease",
  'Multiple Sclerosis',
  'Epilepsy',
  'Stroke',
  // Cardiovascular
  'Heart Disease',
  'Hypertension',
  'Atrial Fibrillation',
  'Heart Failure',
  // Metabolic
  'Type 2 Diabetes',
  'Type 1 Diabetes',
  'Obesity',
  'Thyroid Disease',
  // Respiratory
  'Asthma',
  'COPD',
  'COVID-19',
  'Pneumonia',
  // Mental Health
  'Depression',
  'Anxiety',
  'Schizophrenia',
  'Bipolar Disorder',
  // Inflammatory
  'Rheumatoid Arthritis',
  'Crohn\'s Disease',
  'Psoriasis',
  'Lupus',
  // Others
  'HIV/AIDS',
  'Hepatitis B',
  'Hepatitis C',
  'Kidney Disease',
  'Gene Therapy',
  'Mental Health',
];

export const ANIMATION_VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
};