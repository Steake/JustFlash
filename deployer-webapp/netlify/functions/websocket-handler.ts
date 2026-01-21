import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// WebSocket server for real-time updates
let wss: WebSocket.Server;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'GET' && event.path. includes('/ws')) {
    // Upgrade to WebSocket connection
    return {
      statusCode: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
      body: ''
    };
  }

  // Handle real-time metrics updates
  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body || '{}');
    
    // Store in database
    await supabase. from('metrics').insert({
      timestamp: new Date().toISOString(),
      type: data.type,
      value: data.value,
      metadata: data.metadata
    });

    // Broadcast to connected clients
    broadcastUpdate(data);

    return {
      statusCode:  200,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 404,
    body: 'Not found'
  };
};

function broadcastUpdate(data: any) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}