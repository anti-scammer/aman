import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => {
  console.log(`Anti-scammer backend listening on http://localhost:${PORT}/api`);
});
