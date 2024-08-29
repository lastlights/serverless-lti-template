import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as jose from 'jose'
import { parseBody } from 'lti-util';

// Tools MUST validate the ID Token in the token response in the following manner:

// The Tool MUST Validate the signature of the ID Token according to JSON Web Signature [RFC7515], Section 5.2 using the Public Key from the Platform;

// The Issuer Identifier for the Platform MUST exactly match the value of the iss (Issuer) Claim (therefore the Tool MUST previously have been made aware of this identifier);

// The Tool MUST validate that the aud (audience) Claim contains its client_id value registered as an audience with the Issuer identified by the iss (Issuer) Claim. The aud (audience) Claim MAY contain an array with more than one element. The Tool MUST reject the ID Token if it does not list the client_id as a valid audience, or if it contains additional audiences not trusted by the Tool. The request message will be rejected with a HTTP code of 401;

// If the ID Token contains multiple audiences, the Tool SHOULD verify that an azp Claim is present;

// If an azp (authorized party) Claim is present, the Tool SHOULD verify that its client_id is the Claim's value;

// The alg value SHOULD be the default of RS256 or the algorithm sent by the Tool in the id_token_signed_response_alg parameter during its registration. Use of algorithms other that RS256 will limit interoperability;

// The current time MUST be before the time represented by the exp Claim;

// The Tool MAY use the iat Claim to reject tokens that were issued too far away from the current time, limiting the amount of time that it needs to store nonces used to prevent attacks. The Tool MAY define its own acceptable time range;

// The ID Token MUST contain a nonce Claim. The Tool SHOULD verify that it has not yet received this nonce value (within a Tool-defined time window), in order to help prevent replay attacks. The Tool MAY define its own precise method for detecting replay attacks.

const JWK = jose.createRemoteJWKSet(new URL('https://sso.canvaslms.com/api/lti/security/jwks'))

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Launch: `, event);

    const body = parseBody(event.body, event.headers['content-type']);

    console.log(`Parsed request:`, body);

    // check if the request is a valid LTI launch request
    if (!isValidResponse(body)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request',
            }),
        };
    }

    const jwt = await jose.jwtVerify(body.id_token, JWK);

    console.log(`JWT:`, jwt.payload);

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: ``,
    };
}

type LTILaunchResponse = {
    utf8?: string;
    authenticity_token?: string;
    id_token: string;
    state: string;
    lti_storage_target: string;
}

function isValidResponse(body: Record<string, unknown>): body is LTILaunchResponse {
    if (!body.id_token) return false;
    if (typeof body.id_token !== 'string') return false;
    
    if (!body.state) return false;
    if (typeof body.state !== 'string') return false;
    
    if (!body.lti_storage_target) return false;
    if (typeof body.lti_storage_target !== 'string') return false;

    return true;
}