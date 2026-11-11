import './env';
import { processStreamRecords } from '../modules/realtime/stream.service';
import { setProviders } from '../providers';
import { config } from '../shared/config';
import { log } from '../shared/logger';
import { PORT } from './constants';
import { ensureTable } from './database/table';
import { httpServer } from './http/http-server';
import { routers } from './http/routes';
import { LOCAL_MESSAGES } from './messages';
import { localEvents } from './simulators/events';
import { LocalScheduler } from './simulators/scheduler';
import { startStreamPoller } from './simulators/stream-poller';
import { attachWebSocket, localRealtime } from './simulators/websocket';

function printBanner() {
  console.log(LOCAL_MESSAGES.banner(PORT));
  console.log(LOCAL_MESSAGES.tableInfo(config.tableName, config.dynamoEndpoint, config.mailer));
  console.log(LOCAL_MESSAGES.authHelp);
  for (const r of routers.flatMap((router) => router.definitions())) {
    console.log(LOCAL_MESSAGES.route(r.method, r.path, r.access));
  }
  console.log('');
}

setProviders({ scheduler: new LocalScheduler(), events: localEvents, realtime: localRealtime });
attachWebSocket(httpServer);

if (await ensureTable(config.tableName)) log.info(LOCAL_MESSAGES.tableCreated, { table: config.tableName });
await startStreamPoller(config.tableName, processStreamRecords);

httpServer.listen(PORT, printBanner);
