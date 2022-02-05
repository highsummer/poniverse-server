import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';

const connect: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  return formatJSONResponse(200, {
    message: `OK`,
    event,
  })
};

export const main = middyfy(connect);
