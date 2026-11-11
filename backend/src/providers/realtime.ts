import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { config } from '../shared/config';
import { deleteConnection, listConnectionIds } from '../modules/realtime/connections.repository';
import { log } from '../shared/logger';
import { LOG_MESSAGES } from '../shared/messages/logs';

export interface Realtime {
  broadcast(showId: string, message: unknown): Promise<void>;
}

class ApiGatewayRealtime implements Realtime {
  private client = new ApiGatewayManagementApiClient({
    region: config.region,
    endpoint: config.wsManagementEndpoint,
  });

  async broadcast(showId: string, message: unknown) {
    const data = Buffer.from(JSON.stringify(message));
    const connectionIds = await listConnectionIds(showId);
    await Promise.all(
      connectionIds.map(async (connectionId) => {
        try {
          await this.client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
        } catch (err) {
          if (!(err instanceof GoneException)) {
            log.warn(LOG_MESSAGES.websocketSendFailed, { connectionId, error: (err as Error).message });
            return;
          }
          await deleteConnection(connectionId, showId);
        }
      }),
    );
  }
}

export class NoopRealtime implements Realtime {
  async broadcast() {}
}

export const createRealtime = (): Realtime =>
  config.wsManagementEndpoint ? new ApiGatewayRealtime() : new NoopRealtime();
