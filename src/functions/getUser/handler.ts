import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import schema from './schema';

const DynamoDBClient = new DynamoDB({})

const getUser: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? ""
  const authToken = /^Bearer (.+)$/.exec(authHeader)?.[1]

  const userRow = (await DynamoDBClient.query({
    TableName: "poniverse-users",
    IndexName: "token-index",
    KeyConditionExpression: "#token = :token",
    ExpressionAttributeNames: { "#token": "token", "#type": "type" },
    ExpressionAttributeValues: { ":token": { S: authToken } },
    ProjectionExpression: "username, classId, fullName, #type",
  })).Items[0]

  if (userRow === undefined) {
    return formatJSONResponse(401, {
      message: `unauthorized'`
    })
  }

  if (userRow.username.S !== event.body.username) {
    return formatJSONResponse(401, {
      message: `unauthorized'`
    })
  }

  return formatJSONResponse(200, {
    username: userRow.username.S,
    fullName: userRow.fullName.S,
    classId: userRow.classId.S,
    type: userRow.type?.S
  });
};

export const main = middyfy(getUser);
