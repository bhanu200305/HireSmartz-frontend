import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type LoginState = {
  loginToken?: string;
  authorities: string[];
  rememberMe: boolean;
  canManageCompanySettings: boolean;
  role: {
    name: string;
    type: string;
  };
  userId?: string | undefined | null;
  refreshToken?: string;
};

type LoginPayload = {
  token?: string;
  authorities: string[];
  rememberMe: boolean;
  canManageCompanySettings?: boolean;
  role: {
    name: string;
    type: string;
  };
  userId?: string | undefined | null;
  refreshToken?: string;
};

const initialState: LoginState = {
  loginToken: '',
  authorities: [],
  rememberMe: false,
  canManageCompanySettings: false,
  role: {
    name: '',
    type: '',
  },
  userId: undefined,
  refreshToken: '',
};

const loginSlice = createSlice({
  name: 'LoginSlice',
  initialState,
  reducers: {
    loginStore: (state, action: PayloadAction<LoginPayload>) => {
      return {
        ...state,
        loginToken: action.payload.token,
        authorities: action.payload.authorities,
        rememberMe: action.payload.rememberMe,
        canManageCompanySettings: Boolean(action.payload.canManageCompanySettings),
        role: {
          name: action.payload.role.name,
          type: action.payload.role.type,
        },
        userId: action.payload.userId,
        refreshToken: action.payload.refreshToken,
      };
    },
    resetState: () => {
      return initialState;
    },
    setAllowedAuthorities: (state, action: PayloadAction<string[]>) => {
      state.authorities = action.payload;
    },
  },
});

export const { loginStore, resetState } = loginSlice.actions;
export default loginSlice.reducer;
