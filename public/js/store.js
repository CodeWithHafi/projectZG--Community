/**
 * store.js
 * Centralized State Management using Redux
 */

// Initial State
const initialState = {
    view: 'auth', // 'auth', 'verify-email', 'reset-password', 'update-password', 'onboarding'
    authContainerActive: false, // For Login/Signup toggle in 'auth' view
    user: null,
    isLoading: false,
    error: null,
    onboarding: {
        step: 1,
        totalSteps: 4,
        data: {
            username: '',
            gender: '',
            avatar: null,
            password: ''
        }
    }
};

// Action Types
const SET_VIEW = 'SET_VIEW';
const TOGGLE_AUTH_Container = 'TOGGLE_AUTH_CONTAINER';
const SET_USER = 'SET_USER';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const UPDATE_ONBOARDING_DATA = 'UPDATE_ONBOARDING_DATA';
const SET_ONBOARDING_STEP = 'SET_ONBOARDING_STEP';
const RESET_ONBOARDING = 'RESET_ONBOARDING';

// Reducer
function rootReducer(state = initialState, action) {
    switch (action.type) {
        case SET_VIEW:
            return { ...state, view: action.payload, error: null };
        case TOGGLE_AUTH_Container:
            return { ...state, authContainerActive: action.payload };
        case SET_USER:
            return { ...state, user: action.payload, error: null };
        case SET_LOADING:
            return { ...state, isLoading: action.payload };
        case SET_ERROR:
            return { ...state, error: action.payload, isLoading: false };
        case UPDATE_ONBOARDING_DATA:
            return {
                ...state,
                onboarding: {
                    ...state.onboarding,
                    data: { ...state.onboarding.data, ...action.payload }
                }
            };
        case SET_ONBOARDING_STEP:
            return {
                ...state,
                onboarding: { ...state.onboarding, step: action.payload }
            };
        case RESET_ONBOARDING:
            return {
                ...state,
                onboarding: initialState.onboarding
            };
        default:
            return state;
    }
}

// Create Store
const store = Redux.createStore(
    rootReducer,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// Action Creators (Exposed globally for convenience in auth.js)
window.Actions = {
    setView: (view) => ({ type: SET_VIEW, payload: view }),
    toggleAuthContainer: (isActive) => ({ type: TOGGLE_AUTH_Container, payload: isActive }),
    setUser: (user) => ({ type: SET_USER, payload: user }),
    setLoading: (isLoading) => ({ type: SET_LOADING, payload: isLoading }),
    setError: (error) => ({ type: SET_ERROR, payload: error }),
    updateOnboardingData: (data) => ({ type: UPDATE_ONBOARDING_DATA, payload: data }),
    setOnboardingStep: (step) => ({ type: SET_ONBOARDING_STEP, payload: step }),
    resetOnboarding: () => ({ type: RESET_ONBOARDING })
};

// Expose Store globally
window.store = store;
