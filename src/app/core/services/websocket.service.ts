import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private collabClient?: Client;
  private notifClient?: Client;

  connectCollab(sessionId: string): Observable<any> {
    const subject = new Subject<any>();
    this.collabClient = new Client({
      webSocketFactory: () => new SockJS(`${this.toSockJsHttpUrl(environment.collabWsUrl)}/ws/collab`),
      onConnect: () => {
        this.collabClient!.subscribe(`/topic/sessions/${sessionId}`, (msg: IMessage) => {
          subject.next(JSON.parse(msg.body));
        });
      },
      reconnectDelay: 3000,
    });
    this.collabClient.activate();
    return subject.asObservable();
  }

  sendCollabEvent(destination: string, body: any): void {
    this.collabClient?.publish({ destination, body: JSON.stringify(body) });
  }

  connectNotifications(userId: string | number): Observable<any> {
    const subject = new Subject<any>();
    this.notifClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws/notifications`),
      onConnect: () => {
        this.notifClient!.subscribe(`/topic/notifications/${userId}`, (msg: IMessage) => {
          subject.next(JSON.parse(msg.body));
        });
        this.notifClient!.subscribe(`/topic/notifications/${userId}/unread`, (msg: IMessage) => {
          const payload = JSON.parse(msg.body);
          subject.next({ type: 'UNREAD_COUNT', count: payload?.unreadCount ?? payload ?? 0 });
        });
      },
      reconnectDelay: 5000,
    });
    this.notifClient.activate();
    return subject.asObservable();
  }

  connectExecution(jobId: string): Observable<any> {
    const subject = new Subject<any>();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws/executions`),
      onConnect: () => {
        client.subscribe(`/topic/executions/${jobId}/stdout`, (msg: IMessage) => {
          const payload = JSON.parse(msg.body);
          subject.next({ type: 'STDOUT', data: payload?.chunk ?? msg.body });
        });
        client.subscribe(`/topic/executions/${jobId}/status`, (msg: IMessage) => {
          const payload = JSON.parse(msg.body);
          subject.next({ type: 'STATUS', status: payload?.status ?? msg.body });
        });
      },
    });
    client.activate();
    return subject.asObservable();
  }

  disconnect(): void {
    this.collabClient?.deactivate();
    this.notifClient?.deactivate();
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
