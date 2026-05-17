import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private collabClient?: Client;
  private notifClient?: Client;

  connectCollab(sessionId: string): Observable<any> {
    this.disconnectCollab();
    return new Observable(observer => {
      let subscription: StompSubscription | undefined;
      const client = new Client({
        webSocketFactory: () => new SockJS(`${this.toSockJsHttpUrl(environment.collabWsUrl)}/ws/collab`),
        onConnect: () => {
          subscription = client.subscribe(`/topic/sessions/${sessionId}`, (msg: IMessage) => {
            observer.next(JSON.parse(msg.body));
          });
        },
        reconnectDelay: 3000,
      });
      this.collabClient = client;
      client.activate();
      return () => {
        subscription?.unsubscribe();
        client.deactivate();
        if (this.collabClient === client) {
          this.collabClient = undefined;
        }
      };
    });
  }

  sendCollabEvent(destination: string, body: any): void {
    this.collabClient?.publish({ destination, body: JSON.stringify(body) });
  }

  connectNotifications(userId: string | number): Observable<any> {
    return new Observable(observer => {
      const subscriptions: StompSubscription[] = [];
      const client = new Client({
        webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws/notifications`),
        onConnect: () => {
          subscriptions.push(client.subscribe(`/topic/notifications/${userId}`, (msg: IMessage) => {
            observer.next(JSON.parse(msg.body));
          }));
          subscriptions.push(client.subscribe(`/topic/notifications/${userId}/unread`, (msg: IMessage) => {
            const payload = JSON.parse(msg.body);
            observer.next({ type: 'UNREAD_COUNT', count: payload?.unreadCount ?? payload ?? 0 });
          }));
        },
        reconnectDelay: 5000,
      });
      this.notifClient = client;
      client.activate();
      return () => {
        subscriptions.forEach(subscription => subscription.unsubscribe());
        client.deactivate();
        if (this.notifClient === client) {
          this.notifClient = undefined;
        }
      };
    });
  }

  connectExecution(jobId: string): Observable<any> {
    return new Observable(observer => {
      const subscriptions: StompSubscription[] = [];
      const client = new Client({
        webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws/executions`),
        onConnect: () => {
          subscriptions.push(client.subscribe(`/topic/executions/${jobId}/stdout`, (msg: IMessage) => {
            const payload = JSON.parse(msg.body);
            observer.next({ type: 'STDOUT', data: payload?.chunk ?? msg.body });
          }));
          subscriptions.push(client.subscribe(`/topic/executions/${jobId}/status`, (msg: IMessage) => {
            const payload = JSON.parse(msg.body);
            observer.next({ type: 'STATUS', status: payload?.status ?? msg.body });
          }));
        },
      });
      client.activate();
      return () => {
        subscriptions.forEach(subscription => subscription.unsubscribe());
        client.deactivate();
      };
    });
  }

  disconnect(): void {
    this.disconnectCollab();
    this.notifClient?.deactivate();
  }

  disconnectCollab(): void {
    this.collabClient?.deactivate();
    this.collabClient = undefined;
  }

  private toSockJsHttpUrl(url: string): string {
    if (url.startsWith('wss://')) {
      return `https://${url.slice('wss://'.length)}`;
    }

    if (url.startsWith('ws://')) {
      return `http://${url.slice('ws://'.length)}`;
    }

    return url;
  }
}
