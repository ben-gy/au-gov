// feedback:begin (managed by hub/scripts/feedback/backfill.mjs)
import { mountFeedback } from './feedback';
mountFeedback();
// feedback:end

import './styles.css';
import { App } from './app';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');

const app = new App(root);
app.start().catch((err) => {
  root.innerHTML = `<div class="loading">Failed to load: ${err?.message || err}</div>`;
});
