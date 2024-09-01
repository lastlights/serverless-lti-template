export function parseBody(body: string | null, type: unknown): Record<string, unknown> {
    if (!body) throw new Error('Missing body from request');
    if (!type) throw new Error('Missing content type from request');
    switch (type) {
        case 'application/x-www-form-urlencoded':
            return Object.fromEntries((new URLSearchParams(body)).entries());
        case 'application/json':
            return JSON.parse(body);
        case 'text/plain':
            return { body };
        default:
            throw new Error(`Unsupported content type: ${type}`);
    }
}