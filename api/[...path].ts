import app from '../server.js'; // Fallback if bundled, or use direct handler binding below

export default async function handler(req: any, res: any) {
  return app(req, res);
}