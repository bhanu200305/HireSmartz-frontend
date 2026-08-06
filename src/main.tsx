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
const cfpAntdTheme = {
  token: {
    colorPrimary: '#263d92',
    colorPrimaryHover: '#1d2f73',
    colorPrimaryActive: '#162457',
    colorInfo: '#11b7dd',
    colorLink: '#263d92',
    colorLinkHover: '#11b7dd',
    colorLinkActive: '#1d2f73',
    fontFamily: "'Roboto', sans-serif",
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
