const clientInstances: MockClient[] = [];
const sockJsCalls: string[] = [];

type MessageHandler = (message: { body: string }) => void;

class MockClient {
  subscriptions = new Map<string, MessageHandler>();
  activate = jest.fn(() => {
    this.config.webSocketFactory?.();
    this.config.onConnect?.();
  });
  deactivate = jest.fn();
  publish = jest.fn();

  constructor(private config: { onConnect?: () => void; webSocketFactory?: () => unknown }) {}

  subscribe(destination: string, handler: MessageHandler) {
    this.subscriptions.set(destination, handler);
    return { unsubscribe: jest.fn() };
  }
}

jest.mock('sockjs-client', () => ({
  __esModule: true,
  default: jest.fn((url: string) => {
    sockJsCalls.push(url);
    return { url };
  }),
}));

jest.mock('@stomp/stompjs', () => ({
  Client: jest.fn().mockImplementation((config) => {
    const client = new MockClient(config);
    clientInstances.push(client);
    return client;
  }),
}));

import { WebSocketService } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    clientInstances.length = 0;
    sockJsCalls.length = 0;
    service = new WebSocketService();
  });

  it('connects collaboration sessions and emits parsed messages', done => {
    service.connectCollab('session-7').subscribe(payload => {
      expect(payload).toEqual({ type: 'SYNC' });
      done();
    });

    expect(sockJsCalls[0]).toBe('http://127.0.0.1:8084/ws/collab');

    clientInstances[0].subscriptions.get('/topic/sessions/session-7')?.({
      body: JSON.stringify({ type: 'SYNC' }),
    });
  });

  it('publishes collaboration events through the active client', () => {
    service.connectCollab('session-8').subscribe();

    service.sendCollabEvent('/app/session', { cursor: 3 });

    expect(clientInstances[0].publish).toHaveBeenCalledWith({
      destination: '/app/session',
      body: JSON.stringify({ cursor: 3 }),
    });
  });

  it('maps notification updates and unread counts', done => {
    const received: unknown[] = [];

    service.connectNotifications(15).subscribe(message => {
      received.push(message);
      if (received.length === 2) {
        expect(received).toEqual([
          { type: 'MENTION' },
          { type: 'UNREAD_COUNT', count: 4 },
        ]);
        done();
      }
    });

    expect(sockJsCalls[0]).toBe('http://127.0.0.1:8080/ws/notifications');

    clientInstances[0].subscriptions.get('/topic/notifications/15')?.({
      body: JSON.stringify({ type: 'MENTION' }),
    });
    clientInstances[0].subscriptions.get('/topic/notifications/15/unread')?.({
      body: JSON.stringify({ unreadCount: 4 }),
    });
  });

  it('maps execution stdout and status frames', done => {
    const received: unknown[] = [];

    service.connectExecution('job-1').subscribe(message => {
      received.push(message);
      if (received.length === 2) {
        expect(received).toEqual([
          { type: 'STDOUT', data: 'Hello' },
          { type: 'STATUS', status: 'RUNNING' },
        ]);
        done();
      }
    });

    expect(sockJsCalls[0]).toBe('http://127.0.0.1:8080/ws/executions');

    clientInstances[0].subscriptions.get('/topic/executions/job-1/stdout')?.({
      body: JSON.stringify({ chunk: 'Hello' }),
    });
    clientInstances[0].subscriptions.get('/topic/executions/job-1/status')?.({
      body: JSON.stringify({ status: 'RUNNING' }),
    });
  });

  it('disconnects active collaboration and notification clients', () => {
    service.connectCollab('session-9').subscribe();
    service.connectNotifications(21).subscribe();

    service.disconnect();

    expect(clientInstances[0].deactivate).toHaveBeenCalled();
    expect(clientInstances[1].deactivate).toHaveBeenCalled();
  });
});
