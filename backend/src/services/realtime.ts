import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { ddb } from '../lib/ddb';
import { log } from '../lib/logger';
import { keys } from '../store/keys';

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
    const res = await ddb.send(
      new QueryCommand({
        TableName: config.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': keys.wsShow(showId, '').PK },
      }),
    );
    await Promise.all(
      (res.Items ?? []).map(async (item) => {
        const connectionId = item.connectionId as string;
        try {
          await this.client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
        } catch (err) {
          if (!(err instanceof GoneException)) {
            log.warn('Fallo enviando por WebSocket', { connectionId, error: (err as Error).message });
            return;
          }
          await Promise.all([
            ddb.send(new DeleteCommand({ TableName: config.tableName, Key: keys.wsShow(showId, connectionId) })),
            ddb.send(new DeleteCommand({ TableName: config.tableName, Key: keys.wsConnection(connectionId) })),
          ]);
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
