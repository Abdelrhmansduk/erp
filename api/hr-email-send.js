import { handleHrDirectMailHttpRequest } from '../src/services/hrDirectMailServer.mjs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  return handleHrDirectMailHttpRequest(req, res);
}
