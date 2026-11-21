// Talks to the Node bridge (server/server.js), which talks to the C program.
// The dashboard never changes the queues itself: every change is a command
// sent to C, and the screen is redrawn from the state C sends back.

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok && res.status >= 500) throw new Error(`Bridge returned ${res.status}`);
  return res.json();
}

export const getState = () => request('/api/state');
export const getMenu = () => request('/api/menu');
export const sendCommand = (command, args = []) =>
  request('/api/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args }),
  });
