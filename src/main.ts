// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.

import './styles.css';
import { App } from './app';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');

const app = new App(root);
app.start().catch((err) => {
  root.innerHTML = `<div class="loading">Failed to load: ${err?.message || err}</div>`;
});
