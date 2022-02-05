import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import schema from './schema';
import {randomString, saltedCompare} from "@functions/utils";

const DynamoDBClient = new DynamoDB({})

const TokenSpan = 1000 * 60 * 60 * 3

const createToken: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const userRow = await DynamoDBClient.getItem({
    TableName: "poniverse-users",
    Key: {
      username: { S: event.body.username },
    },
  })

  if (userRow.Item === undefined) {
    return formatJSONResponse(401, {
      message: `no such user '${event.body.username}'`
    })
  }

  if (!saltedCompare(event.body.password, userRow.Item.salt.S, userRow.Item.password.S)) {
    return formatJSONResponse(401, {
      message: "unauthorized",
    })
  }

  const newToken = randomString(36)

  await DynamoDBClient.updateItem({
    TableName: "poniverse-users",
    Key: {
      username: { S: event.body.username },
    },
    UpdateExpression: "SET #token = :token, #tokenCreatedAt = :tokenCreatedAt, #tokenExpireAt = :tokenExpireAt",
    ExpressionAttributeNames: {
      "#token": "token",
      "#tokenCreatedAt": "tokenCreatedAt",
      "#tokenExpireAt": "tokenExpireAt",
    },
    ExpressionAttributeValues: {
      ":token": { S: newToken },
      ":tokenCreatedAt" : { S: new Date().toISOString() },
      ":tokenExpireAt": { S: new Date(new Date().getTime() + TokenSpan).toISOString() }
    },
  })

  return formatJSONResponse(200, {
    token: newToken,
  });
};

export const main = middyfy(createToken);
