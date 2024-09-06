import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

type OIDCRegistrationRequest = {
    openid_configuration: string;
    registration_token: string;
}

type LTIRegistration = {
    application_type: "web";
    grant_types: ["client_credentials", "implicit"];
    initiate_login_uri: string;
    redirect_uris: Array<string>;
    response_types: ["id_token"];
    client_name: string;
    jwks_uri: string; // The URL of the JSON Web Key Set (JWKS) document containing the public keys that should be used by the platform to validate the JWTs issued by the tool.
    token_endpoint_auth_method: "private_key_jwt";
    scope: string;
    'https://purl.imsglobal.org/spec/lti-platform-configuration': LTIToolConfiguration; // The LTI 1.3 Tool Configuration object that describes the tool to be registered. This object is used to create the tool in Canvas. The object must contain the following properties: domain, target_link_uri, messages, claims, and
}

type LTIToolConfiguration = {
    domain: string;
    secondary_domains?: Array<string>;
    target_link_uri: string;
    custom_parameters?: Record<string, string>;
    description?: string;
    messages: Array<LTIMessage>;
    claims: Array<string>;
    'https://canvas.instructure.com/lti/privacy_level'?: "public" | "name_only" | "email_only" | "anonymous"; // The privacy level of the tool. The "public" value indicates that the tool can access the user's name and email address. The "name_only" value indicates that the tool can only access the user's name. The "email_only" value indicates that the tool can only access the user's email address. The "anonymous" value indicates that the tool can't access the user's name or email address.
    'https://canvas.instructure.com/lti/tool_id'?: string; // The tool ID as defined in the LTI 1.3 Tool Configuration. This is used to identify the tool in Canvas.
}

type LTIMessage = {
    type: "LtiResourceLinkRequest" | "LtiDeepLinkingRequest";
    target_link_uri?: string;
    label?: string;
    icon_uri?: string;
    custom_parameters?: Record<string, string>;
    placements?: Array<PlacementType>;
    'https://canvas.instructure.com/lti/course_navigation/default_enabled'?: boolean; // Only applies if the placement is "course_navigation". If false, the tool will not appear in the course navigation bar, but can still be re-enabled by admins and teachers. Defaults to 'true'. See the "default" setting as discussed in the Navigation Tools docs.
    'https://canvas.instructure.com/lti/visibility'?: "admins" | "members" | "public"; // Determines what users can see a link to launch this message. The "admins" value indicates users that can manage the link can see it, which for the Global Navigation placement means administrators, but in courses means administrators and instructors. The "members" value indicates that any member of the context the link appears in can see the link, and "public" means visible to all.
}

type PlacementType = "account_navigation" |
                    "assignment_edit" |
                    "assignment_group_menu" |
                    "assignment_index_menu" |
                    "assignment_menu" |
                    "assignment_selection" |
                    "assignment_view" |
                    "collaboration" |
                    "conference_selection" |
                    "course_assignments_menu" |
                    "course_home_sub_navigation" |
                    "course_navigation" |
                    "course_settings_sub_navigation" |
                    "discussion_topic_index_menu" |
                    "discussion_topic_menu" |
                    "file_index_menu" |
                    "file_menu" |
                    "global_navigation" |
                    "homework_submission" |
                    "link_selection" |
                    "migration_selection" |
                    "module_group_menu" |
                    "module_index_menu" |
                    "module_index_menu_modal" |
                    "module_menu_modal" |
                    "module_menu" |
                    "post_grades" |
                    "quiz_index_menu" |
                    "quiz_menu" |
                    "similarity_detection" |
                    "student_context_card" |
                    "submission_type_selection" |
                    "tool_configuration" |
                    "top_navigation" |
                    "user_navigation" |
                    "wiki_index_menu" |
                    "wiki_page_menu";

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
    console.log(`Registration:`, event);

    if (!isValidRequest(event.queryStringParameters)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid request',
            }),
        };
    }

    const response = await fetch(new URL(event.queryStringParameters.openid_configuration), {
        headers: {
            Authorization: `Bearer ${event.queryStringParameters.registration_token}`,
        },
    });

    const openid_configuration = await response.json();

    console.log(`OpenID Configuration:`, openid_configuration);

    console.log(openid_configuration['https://purl.imsglobal.org/spec/lti-platform-configuration']);

    const str = JSON.stringify(openid_configuration, null, 2);

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html',
        },
        body: `<style>pre {outline: 1px solid #ccc; padding: 5px; margin: 5px; }
                .string { color: green; }
                .number { color: darkorange; }
                .boolean { color: blue; }
                .null { color: magenta; }
                .key { color: red; }</style><pre>${syntaxHighlight(str)}</pre>`,
    };
}

function isValidRequest(request: any): request is OIDCRegistrationRequest {
    if (!request.openid_configuration) return false;
    if (typeof request.openid_configuration !== 'string') return false;

    if (!request.registration_token) return false;
    if (typeof request.registration_token !== 'string') return false;

    return true;
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}