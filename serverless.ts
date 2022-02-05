import type { AWS } from '@serverless/typescript';

import createToken from '@functions/createToken';
import createUser from '@functions/createUser';
import connect from '@functions/connect';
import defaultAction from '@functions/defaultAction';
import disconnect from '@functions/disconnect';
import getUser from "@functions/getUser";
import updateUser from "@functions/updateUser";

const serverlessConfiguration: AWS = {
  service: 'poniverse-api',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    region: "ap-northeast-2",
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  // import the function via paths
  functions: { createToken, createUser, getUser, updateUser, connect, defaultAction, disconnect },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
  resources: {
    Resources: {
      GatewayResponseDefault4XX: {
        Type: "AWS::ApiGateway::GatewayResponse",
        Properties: {
          ResponseParameters: {
            "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
            "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
          },
          ResponseType: "DEFAULT_4XX",
          RestApiId: {
            Ref: "ApiGatewayRestApi",
          }
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;
