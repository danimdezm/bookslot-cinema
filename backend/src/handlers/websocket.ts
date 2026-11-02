import { BatchWriteCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { config } from '../config';
import { ddb } from '../lib/ddb';
import { epochSeconds, keys } from '../store/keys';

const SHOW_ID = /^[\w-]{1,64}$/;
const CONNECTION_TTL_SECONDS = 2 * 3600;

type WsEvent = APIGatewayProxyWebsocketEventV2 & { queryStringParameters?: Record<string, string> };

export const handler = async (event: WsEvent): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, connectionId } = event.requestContext;

  if (routeKey === '$connect') {
    const showId = event.queryStringParameters?.showId;
    if (!showId || !SHOW_ID.test(showId)) return { statusCode: 400, body: 'showId requerido' };
    const ttl = epochSeconds(new Date()) + CONNECTION_TTL_SECONDS;
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [config.tableName]: [
            { PutRequest: { Item: { ...keys.wsShow(showId, connectionId), type: 'WSCONN', connectionId, showId, ttl } } },
            { PutRequest: { Item: { ...keys.wsConnection(connectionId), type: 'CONN', connectionId, showId, ttl } } },
          ],
        },
      }),
    );
    return { statusCode: 200 };
  }

  if (routeKey === '$disconnect') {
    const res = await ddb.send(new GetCommand({ TableName: config.tableName, Key: keys.wsConnection(connectionId) }));
    const showId = res.Item?.showId as string | undefined;
    await Promise.all([
      ddb.send(new DeleteCommand({ TableName: config.tableName, Key: keys.wsConnection(connectionId) })),
      showId && ddb.send(new DeleteCommand({ TableName: config.tableName, Key: keys.wsShow(showId, connectionId) })),
    ]);
  }

  return { statusCode: 200 };
};
