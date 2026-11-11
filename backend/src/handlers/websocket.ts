import type { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { deleteConnectionById, saveConnection } from '../modules/realtime/connections.repository';
import { SHOW_ID_PATTERN } from '../shared/constants';

type WsEvent = APIGatewayProxyWebsocketEventV2 & { queryStringParameters?: Record<string, string> };

export const handler = async (event: WsEvent): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, connectionId } = event.requestContext;

  if (routeKey === '$connect') {
    const showId = event.queryStringParameters?.showId;
    if (!showId || !SHOW_ID_PATTERN.test(showId)) return { statusCode: 400, body: 'showId requerido' };
    await saveConnection(showId, connectionId);
  }
  if (routeKey === '$disconnect') await deleteConnectionById(connectionId);

  return { statusCode: 200 };
};
