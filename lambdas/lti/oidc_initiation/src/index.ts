import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { parseBody } from 'lti-util';

const PLATFORM_TABLE = process.env.PLATFORM_TABLE || '';

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface OIDCInitiationRequest {
    iss: string; // The issuer identifier (e.g. https://canvas.instructure.com)
    login_hint: string; // Opaque value that must be passed back to platform in the next step.
    target_link_uri: string; // The URL to which the user should be redirected after login.
}

interface CanvasInitiationRequest extends OIDCInitiationRequest {
    client_id: string; // The OAuth2 client id, or Developer Key id, for convenience.
    deployment_id: string; // The deployment id for the tool.
    lti_message_hint: string; // The LTI message hint, as a JWT.
    canvas_environment: 'prod' | 'beta' | 'test'; // For hosted Canvas, the environment (e.g. "production", "beta", or "test") from which the tool is being launched.
    canvas_region: string; // The region in which the Canvas instance is hosted.
    lti_storage_target: string; // The LTI storage target.
}

const LOGIN_URL = 'https://sso.canvaslms.com/api/lti/authorize_redirect'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Login initiation:`, event);

    const body = parseBody(event.body, event.headers['Content-Type']);


    console.log(`Parsed request:`, body);

    if (!isValidRequest(body)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request',
            }),
        };
    }

    // retrieve platform information from the issuer
    // const platform_config = await getPlatformConfig(body.iss);

    // redirect to the Canvas login with the following params
    const params = {
        login_hint: body.login_hint,
        client_id: body.client_id as string ?? '',
        redirect_uri: body.target_link_uri,
        scope: 'openid',
        state: uuidv4(),
        nonce: uuidv4(),
        prompt: 'none',
        response_mode: 'form_post',
        response_type: 'id_token'
    }

    return {
        statusCode: 307,
        headers: {
            Location: `${LOGIN_URL}?${new URLSearchParams(params).toString()}`,
        },
        multiValueHeaders: {
            'Set-Cookie': [
                `state=${params.state}; HttpOnly; SameSite=Lax`,
                `nonce=${params.nonce}; HttpOnly; SameSite=Lax`,
            ],
        },
        body: '', // Add an empty string or provide an appropriate value for the body property.
    };
}

function isValidRequest(request: any): request is OIDCInitiationRequest {
    return true;
}

async function getPlatformConfig(iss: string): Promise<any> {
    const params: QueryCommandInput = {
        TableName: PLATFORM_TABLE,
        KeyConditionExpression: 'iss = :iss',
        ExpressionAttributeValues: {
            ':iss': iss,
        },
    };

    const command = new QueryCommand(params);
    const response = await ddbDocClient.send(command);

    return response.Items;
}