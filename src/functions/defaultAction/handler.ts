import {ApiGatewayManagementApi} from "@aws-sdk/client-apigatewaymanagementapi";
import {formatJSONResponse} from "@libs/api-gateway";
import {APIGatewayProxyHandler} from "aws-lambda";
import {DynamoDB} from "@aws-sdk/client-dynamodb";
import {DefaultWebSocketMessage} from "@functions/types";

const DynamoDBClient = new DynamoDB({})

const AuthCacheExpiry = 1000 * 60 * 5
const AuthCache: Record<string, { username: string, expireAt: Date }> = {}

function tryAuthHit(authToken: string): string | null {
  if (authToken in AuthCache && AuthCache[authToken].expireAt.getTime() < new Date().getTime()) {
    return AuthCache[authToken].username
  } else if (authToken in AuthCache) {
    delete AuthCache[authToken]
    return null
  } else {
    return null
  }
}

async function tryAuthMiss(authToken: string): Promise<string | null> {
  const userRow = (await DynamoDBClient.query({
    TableName: "poniverse-users",
    IndexName: "token-index",
    KeyConditionExpression: "#token = :token",
    ExpressionAttributeNames: { "#token": "token" },
    ExpressionAttributeValues: { ":token": { S: authToken } },
    ProjectionExpression: "username, tokenExpireAt",
  })).Items[0]

  if (userRow === undefined || Date.parse(userRow.tokenExpireAt.S) < new Date().getTime()) {
    return null
  } else {
    AuthCache[authToken] = {
      username: userRow.username.S,
      expireAt: new Date(new Date().getTime() + AuthCacheExpiry),
    }

    return userRow.username.S
  }
}

async function tryAuth(authToken: string): Promise<string | null> {
  return tryAuthHit(authToken) ?? await tryAuthMiss(authToken)
}

interface UpdateLocation extends DefaultWebSocketMessage {
  type: "updateLocation",
  userId: string,
  playerType: string,
  area: string,
  chunk: [number, number],
  position: [number, number],
  updateChunk: boolean,
}

const ChunkExpansion = 1

function getLocationKey(area: string, chunk: [number, number]): string {
  return `${area}#${chunk[0]}#${chunk[1]}`
}

const defaultAction: APIGatewayProxyHandler = async (event) => {
  const body = JSON.parse(event.body)
  const authUser = await tryAuth(body.authToken)
  if (authUser === null) {
    return formatJSONResponse(401, {
      message: "unauthorized",
    })
  }

  if (body.type === "updateLocation") {
    const typedBody = body as UpdateLocation

    const gatewayClient = new ApiGatewayManagementApi({
      endpoint: {
        protocol: "https",
        hostname: event.requestContext.domainName,
        path: event.requestContext.stage,
      }
    })

    const executionResults = await Promise.allSettled([
      typedBody.updateChunk ?
        DynamoDBClient.updateItem({
          TableName: "poniverse-location-by-connection",
          Key: {
            "connectionId": { S: event.requestContext.connectionId },
          },
          UpdateExpression: "SET locationKey = :locationKey, #position = :position",
          ExpressionAttributeNames: {
            "#position": "position",
          },
          ExpressionAttributeValues: {
            ":locationKey": { S: getLocationKey(typedBody.area, typedBody.chunk) },
            ":position": { L: typedBody.chunk.map(x => ({ N: x.toString() })) }
          },
        }) :
        Promise.resolve(),
      Promise.allSettled(
        new Array(2 * ChunkExpansion + 1).fill(0)
          .flatMap((_, i) => new Array(2 * ChunkExpansion + 1).fill(0)
            .map((_, j) => {
              const dx = j - ChunkExpansion
              const dy = i - ChunkExpansion
              const chunk: [number, number] = [typedBody.chunk[0] + dx, typedBody.chunk[1] + dy]
              return DynamoDBClient
                .query({
                  IndexName: "locationKey-index",
                  KeyConditionExpression: "locationKey = :locationKey",
                  ExpressionAttributeValues: {
                    ":locationKey": { S: getLocationKey(typedBody.area, chunk) },
                  },
                  TableName: `poniverse-location-by-connection`,
                  ProjectionExpression: "connectionId",
                })
            })),
      )
        .then(results => {
          const body = {
            type: "updateLocation",
            userId: typedBody.userId,
            playerType: typedBody.playerType,
            position: typedBody.position,
          }
          const payload = Uint8Array.from(Buffer.from(JSON.stringify(body)))
          return Promise.allSettled(
            results
              .flatMap(result => result.status == "fulfilled" ? result.value.Items : [])
              .map(item => {
                return gatewayClient
                  .postToConnection({
                    ConnectionId: item["connectionId"].S,
                    Data: payload,
                  })
              })
          )
        })
    ])

    const errors = executionResults.flatMap(result => result.status === "rejected" ? [result] : [])
    if (errors.length > 0) {
      throw new Error(`error executing dynamodb actions: ${errors.map(error => error.reason).join(", ")}`)
    }
  }

  return formatJSONResponse(200, {
    message: "OK",
  })
};

export const main = defaultAction;
