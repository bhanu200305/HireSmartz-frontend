import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ConfigProvider } from 'antd';
import './index.css';
import App from './App.tsx';

import { BrowserRouter as Router } from 'react-router-dom';
import { store, persistor } from './redux/provider/store.ts';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// CareerForce Pro brand theme applied to every Ant Design component app-wide.
// Sourced from the same CSS custom properties as the Tailwind theme
// (src/theme/index.css) so AntD and the hand-rolled shared/ui kit never drift
// apart — change a hex value once, both systems pick it up.
const cfpAntdTheme = {
  token: {
    // Color — one primary (navy), cyan kept narrow (info/links only)
    colorPrimary: 'var(--primary-600)',
    colorPrimaryHover: 'var(--primary-700)',
    colorPrimaryActive: 'var(--primary-800)',
    colorInfo: 'var(--accent-400)',
    colorSuccess: 'var(--success-solid)',
    colorWarning: 'var(--warning-solid)',
    colorError: 'var(--danger-solid)',
    colorLink: 'var(--primary-600)',
    colorLinkHover: 'var(--accent-400)',
    colorLinkActive: 'var(--primary-700)',
    colorTextBase: 'var(--gray-900)',
    colorBorder: 'var(--gray-200)',
    colorBorderSecondary: 'var(--gray-100)',

    // Type
    fontFamily: 'var(--font-sans)',
    fontSize: 14,

    // Shape — matches the app-wide radius scale (sm 6 / md 8 / lg 12 / xl 16)
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Elevation — navy-tinted, not pure black; reserved for floating layers
    // (dropdowns, modals, popovers) to match the rest of the app.
    boxShadow: '0 2px 8px rgba(16, 26, 58, 0.08)',
    boxShadowSecondary: '0 8px 24px rgba(16, 26, 58, 0.12)',
  },
  components: {
    Button: { borderRadius: 8, fontWeight: 600 },
    Input: { borderRadius: 8 },
    InputNumber: { borderRadius: 8 },
    Select: { borderRadius: 8 },
    DatePicker: { borderRadius: 8 },
    Table: { borderRadiusLG: 12, headerBg: 'var(--gray-50)', headerColor: 'var(--gray-600)' },
    Card: { borderRadiusLG: 12 },
    Modal: { borderRadiusLG: 16 },
    Tag: { borderRadiusSM: 6 },
    // Cyan-underline tabs, matching the wireframe reference — applies to
    // every plain AntD <Tabs> app-wide (CompanySettings, MyCompany, job/
    // candidate detail tabs) without touching each page individually.
    Tabs: {
      inkBarColor: 'var(--accent-400)',
      itemColor: 'var(--gray-500)',
      itemHoverColor: 'var(--accent-500)',
      itemSelectedColor: 'var(--primary-600)',
      itemActiveColor: 'var(--primary-600)',
      titleFontSizeLG: 14,
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <Router>
          <ConfigProvider theme={cfpAntdTheme}>
            <App />
          </ConfigProvider>
        </Router>
      </PersistGate>
    </Provider>
  </StrictMode>
);
