import { CONNECTION_TTL_SECONDS } from '../../shared/constants';
import { epochSeconds, keys } from '../../shared/dynamo/keys';
import { batchPut, deleteItem, getItem, queryItems } from '../../shared/dynamo/operations';

interface Connection {
  connectionId: string;
  showId: string;
}

const toItems = ({ connectionId, showId }: Connection) => {
  const ttl = epochSeconds(new Date()) + CONNECTION_TTL_SECONDS;
  return [
    { ...keys.wsShow(showId, connectionId), type: 'WSCONN', connectionId, showId, ttl },
    { ...keys.wsConnection(connectionId), type: 'CONN', connectionId, showId, ttl },
  ];
};

export async function listConnectionIds(showId: string): Promise<string[]> {
  const connections = await queryItems<Connection>({
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': keys.wsShow(showId, '').PK },
  });
  return connections.map((c) => c.connectionId);
}

export const saveConnection = (showId: string, connectionId: string) => batchPut(toItems({ connectionId, showId }));

export async function deleteConnection(connectionId: string, showId?: string): Promise<void> {
  await Promise.all([
    deleteItem(keys.wsConnection(connectionId)),
    showId && deleteItem(keys.wsShow(showId, connectionId)),
  ]);
}

export async function deleteConnectionById(connectionId: string): Promise<void> {
  const connection = await getItem<Connection>(keys.wsConnection(connectionId));
  await deleteConnection(connectionId, connection?.showId);
}
