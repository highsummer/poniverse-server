import { formatJSONResponse } from '@libs/api-gateway';
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import {APIGatewayProxyHandler} from "aws-lambda";

const DynamoDBClient = new DynamoDB({})

const disconnect: APIGatewayProxyHandler = async (event) => {
  await DynamoDBClient.deleteItem({
    TableName: "poniverse-location-by-connection",
    Key: {
      "connectionId": { S: event.requestContext.connectionId },
    },
  })

  return formatJSONResponse(200, {
    message: `OK`,
    event,
  })
};

export const main = disconnect;
