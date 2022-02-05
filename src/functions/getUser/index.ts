import schema from './schema';
import { handlerPath } from '@libs/handler-resolver';
import {AWS} from "@serverless/typescript";

export default <AWS["functions"][string]>{
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'get-user',
        cors: true,
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
};
