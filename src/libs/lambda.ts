import middy from "@middy/core"
import jsonBodyParser from "@middy/http-json-body-parser"
import cors from '@middy/http-cors'
import {formatJSONResponse} from "@libs/api-gateway";

export const middyfy = (handler) => {
  return middy(async (body: any) => {
    try {
      return await handler(body)
    } catch (e) {
      console.error(`
=== unhandled internal server error ===
message: ${e.message}
error: ${e}
=======================================
`)
      return formatJSONResponse(500, {
        message: "internal server error",
      })
    }
  }).use(jsonBodyParser())
    .use(cors())
}
