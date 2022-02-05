import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import schema from './schema';
import {randomString, saltedHash} from "@functions/utils";

const DynamoDBClient = new DynamoDB({})

const createUser: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const codeRow = await DynamoDBClient.getItem({
    TableName: "poniverse-registration-status",
    Key: {
      studentId: { S: event.body.studentId },
    },
  })

  if (codeRow.Item === undefined) {
    return formatJSONResponse(404, {
      message: `no such student id '${event.body.studentId}'`
    })
  }

  if (codeRow.Item.usedAt?.S) {
    return formatJSONResponse(403, {
      message: `student id '${event.body.studentId}' is already registered`
    })
  }

  if (event.body.fullName !== codeRow.Item.fullName.S || event.body.classId !== codeRow.Item.classId.S) {
    return formatJSONResponse(403, {
      message: `invalid personal information about '${event.body.studentId}'`
    })
  }

  await DynamoDBClient.updateItem({
    TableName: "poniverse-registration-status",
    Key: {
      studentId: codeRow.Item.studentId,
    },
    UpdateExpression: "SET #usedAt = :usedAt, #confirmStatus = :confirmStatus",
    ExpressionAttributeNames: { "#usedAt": "usedAt", "#confirmStatus": "confirmStatus" },
    ExpressionAttributeValues: { ":usedAt": { S: new Date().toISOString() }, ":confirmStatus": { S: "pending" } },
  })

  const salt = randomString(36)
  const hashedPassword = saltedHash(event.body.password, salt)

  await DynamoDBClient.putItem({
    TableName: "poniverse-users",
    Item: {
      username: { S: codeRow.Item.studentId.S },
      password: { S: hashedPassword },
      salt: { S: salt },
      token: { S: randomString(36) },
      registeredAt: { S: new Date().toISOString() },
      fullName: { S: codeRow.Item.fullName.S },
      classId: { S: codeRow.Item.classId.S },
    },
  })

  await DynamoDBClient.updateItem({
    TableName: "poniverse-registration-status",
    Key: {
      studentId: codeRow.Item.studentId,
    },
    UpdateExpression: "SET #confirmStatus = :confirmStatus",
    ExpressionAttributeNames: { "#confirmStatus": "confirmStatus" },
    ExpressionAttributeValues: { ":confirmStatus": { S: "confirmed" } },
  })

  return formatJSONResponse(200, {});
};

export const main = middyfy(createUser);
