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
    iss: 'https://canvas.instructure.com';
    client_id: string; // The OAuth2 client id, or Developer Key id, for convenience.
    deployment_id: string; // The deployment id for the tool.
    lti_message_hint: string; // The LTI message hint, as a JWT.
    canvas_environment: 'prod' | 'beta' | 'test'; // For hosted Canvas, the environment (e.g. "production", "beta", or "test") from which the tool is being launched.
    canvas_region: string; // The region in which the Canvas instance is hosted.
    lti_storage_target: string; // The LTI storage target.
}

interface BlackboardInitiationRequest extends OIDCInitiationRequest {
    iss: 'https://blackboard.com';
    lti_message_hint: string; // The LTI message hint, as a JWT.
    lti_deployment_id: string; // The deployment id for the tool.
    client_id: string; // The OAuth2 client id, or Developer Key id, for convenience.
    lti_storage_target: string; // The LTI storage target.
}

type LTIInitiationRequest = CanvasInitiationRequest | BlackboardInitiationRequest;

const LOGIN_URL = 'https://sso.canvaslms.com/api/lti/authorize_redirect'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Login initiation:`, event);

    const body = parseBody(event.body, event.headers['Content-Type']);


    console.log(`Parsed request:`, body);

    if (!isValidRequest(body)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid initiation request',
            }),
        };
    }

    return processLtiInitiation(body);
}

function processLtiInitiation(body: LTIInitiationRequest): APIGatewayProxyResult {
    switch (body.iss) {
        case 'https://canvas.instructure.com':
            return initiateCanvasLogin(body);
        case 'https://blackboard.com':
            return initiateBlackboardLogin(body);
        default:
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Unsupported platform',
                }),
            };
    }
}

function initiateCanvasLogin(body: CanvasInitiationRequest): APIGatewayProxyResult {

    const config = getPlatformConfig(body.iss);

    const params = {
        login_hint: body.login_hint,
        client_id: body.client_id,
        redirect_uri: body.target_link_uri,
        scope: 'openid',
        state: uuidv4(),
        nonce: uuidv4(),
        prompt: 'none',
        response_mode: 'form_post',
        response_type: 'id_token',
    };

    return {
        statusCode: 307,
        headers: {
            Location: `${LOGIN_URL}?${new URLSearchParams(params)}`,
        },
        multiValueHeaders: {
            'Set-Cookie': [
                `state=${params.state}; HttpOnly; SameSite=Lax`,
                `nonce=${params.nonce}; HttpOnly; SameSite=Lax`,
            ],
        },
        body: '',
    };
}

function initiateBlackboardLogin(body: BlackboardInitiationRequest): APIGatewayProxyResult {
    throw new Error('Not implemented');
}

function isValidRequest(request: any): request is LTIInitiationRequest {
    if (!request.iss) return false;
    if (typeof request.iss !== 'string') return false;

    if (!request.login_hint) return false;
    if (typeof request.login_hint !== 'string') return false;

    if (!request.target_link_uri) return false;
    if (typeof request.target_link_uri !== 'string') return false;

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