import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import schema from './schema';

const DynamoDBClient = new DynamoDB({})

const updateUser: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? ""
  const authToken = /^Bearer (.+)$/.exec(authHeader)?.[1]

  const userRow = (await DynamoDBClient.query({
    TableName: "poniverse-users",
    IndexName: "token-index",
    KeyConditionExpression: "#token = :token",
    ExpressionAttributeNames: { "#token": "token" },
    ExpressionAttributeValues: { ":token": { S: authToken } },
    ProjectionExpression: "username, fullName, classId",
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

  const updates = (["type"] as any).flatMap(key => {
    const value = event.body[key]
    if (value !== undefined) {
      return [[key, value]] as [string, string][]
    } else {
      return []
    }
  })

  await DynamoDBClient.updateItem({
    TableName: "poniverse-users",
    Key: {
      username: { S: event.body.username },
    },
    UpdateExpression: `SET ${updates.map(([key, _value]) => `#${key} = :${key}`).join(", ")}`,
    ExpressionAttributeNames: Object.fromEntries(updates.map(([key, _value]) => [`#${key}`, key])),
    ExpressionAttributeValues: Object.fromEntries(updates.map(([key, value]) => [`:${key}`, { S: value }])),
  })

  return formatJSONResponse(200, {});
};

export const main = middyfy(updateUser);
