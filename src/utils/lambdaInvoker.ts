import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from "@aws-sdk/client-lambda";
import Logger from "./logger";

const logger = new Logger("invokeLambda");
const lambdaClient = new LambdaClient({});

interface InvokeLambdaParams {
  FunctionName: string;
  Payload?: any;
  PathParameters?: { [key: string]: string };
}

export const invokeLambda = async (params: InvokeLambdaParams) => {
  const { FunctionName, Payload = {}, PathParameters = {} } = params;

  const lambdaPayload = {
    ...Payload,
    pathParameters: PathParameters, // ensure pathParameters is correctly nested
  };

  const lambdaParams = {
    FunctionName,
    InvocationType: InvocationType.RequestResponse, // waits for response from the invoked function
    Payload: JSON.stringify(lambdaPayload),
  };

  logger.info(
    `Invoking lambda ${FunctionName} with payload: ${JSON.stringify(
      lambdaPayload
    )}`
  );

  const command = new InvokeCommand(lambdaParams);

  try {
    const response = await lambdaClient.send(command);
    logger.info(`Lambda ${FunctionName} invoked successfully`);

    if (response.FunctionError) {
      const errorMessage = response.Payload
        ? JSON.parse(new TextDecoder().decode(response.Payload)).errorMessage
        : "Lambda invocation error";
      logger.error(`Error invoking lambda ${FunctionName}: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return response;
  } catch (error: any) {
    logger.error(`Failed to invoke ${FunctionName}: ${error.message}`);
    throw error;
  }
};
