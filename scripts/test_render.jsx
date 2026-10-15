import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from './src/App.jsx';

try {
  const html = ReactDOMServer.renderToString(React.createElement(App));
  console.log('[OK] Rendered successfully without exceptions! Output length:', html.length);
  console.log('Snippet:', html.slice(0, 200));
} catch (err) {
  console.error('[ERROR] Render error:', err);
}
