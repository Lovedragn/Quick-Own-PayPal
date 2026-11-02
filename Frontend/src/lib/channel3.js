import { Channel3 } from '@channel3/sdk';

// Initialize Channel3 Client
// Uses CHANNELV3_SECRET or CHANNEL3_API_KEY from environment variables
const apiKey = process.env.CHANNELV3_SECRET || process.env.CHANNEL3_API_KEY;

export const channel3 = new Channel3({
  apiKey: apiKey,
});

export default channel3;

