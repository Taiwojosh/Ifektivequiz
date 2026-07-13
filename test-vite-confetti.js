import { createServer } from 'vite';
async function test() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  const module = await server.ssrLoadModule('canvas-confetti');
  console.log(module);
  server.close();
}
test();
