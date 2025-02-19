import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import Logger from "./logger";

const lambdaClient = new LambdaClient({});
const logger = new Logger("LambdaInvoker");

export const invokeLambda = async ({
  FunctionName,
  Payload,
}: {
  FunctionName: string;
  Payload: Record<string, unknown>;
}) => {
  try {
    const command = new InvokeCommand({
      FunctionName,
      Payload: Buffer.from(JSON.stringify(Payload)),
    });

    const response = await lambdaClient.send(command);
    if (response.Payload) {
      return JSON.parse(Buffer.from(response.Payload).toString());
    }
    return response;
  } catch (error) {
    logger.error(`Error invoking Lambda function ${FunctionName}: ${error}`);
    throw error;
  }
};
