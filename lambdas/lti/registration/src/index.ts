import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Registration:`, event);

    const response = await fetch(new URL(event.queryStringParameters!.openid_configuration!));

    const openid_configuration = await response.json();

    console.log(`OpenID Configuration:`, openid_configuration);

    console.log(openid_configuration['https://purl.imsglobal.org/spec/lti-platform-configuration']);

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: ``,
    };
}