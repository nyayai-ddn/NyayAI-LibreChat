import 'regenerator-runtime/runtime';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import './locales/i18n';
import App from './App';
import './style.css';
import './mobile.css';
import { ApiErrorBoundaryProvider } from './hooks/ApiErrorBoundaryContext';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/copy-tex.js';

posthog.init('phc_u4Tsa3kCaqaS77owVSVKRN33kgApKU8NU6BkhivzMfVf', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ApiErrorBoundaryProvider>
    <App />
  </ApiErrorBoundaryProvider>,
);
