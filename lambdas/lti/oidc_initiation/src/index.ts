import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid'; // Import the uuidv4 function from the uuid library.

interface CanvasLoginRequest {
    iss: string; // The issuer identifier (e.g. Canvas)
    login_hint: string; // Opaque value that must be passed back to Canvas in the next step.
    target_link_uri: string; // The URL to which the user should be redirected after login.
    client_id?: string; // The OAuth2 client id, or Developer Key id, for convenience.
    deployment_id?: string; // The deployment id for the tool.
    canvas_region?: string; // The region in which the Canvas instance is hosted.
    canvas_environment?: string; // For hosted Canvas, the environment (e.g. "production", "beta", or "test") from which the tool is being launched.
}

const LOGIN_URL = 'https://sso.canvaslms.com/api/lti/authorize_redirect'

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Login initiation:`, event);

    // parse event.body as query string
    const raw_request = new URLSearchParams(event.body || '');

    const request = Object.fromEntries(raw_request.entries());

    console.log(`Parsed request:`, request);

    if (!isCanvasLoginRequest(request)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request',
            }),
        };
    }

    // redirect to the Canvas login with the following params
    const params = {
        login_hint: request.login_hint,
        client_id: request.client_id,
        redirect_uri: request.target_link_uri,
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
            Location: `${LOGIN_URL}?${querystring.stringify(params)}`,
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

function isCanvasLoginRequest(request: any): request is CanvasLoginRequest {
    return true;
}