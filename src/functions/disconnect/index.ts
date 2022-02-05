import { handlerPath } from '@libs/handler-resolver';
import {AWS} from "@serverless/typescript";

export default <AWS["functions"][string]>{
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      websocket: {
        route: "$disconnect"
      },
    },
  ],
};
