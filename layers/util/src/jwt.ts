import * as jose from 'jose';

export async function verifyJWT(jwt: string, jwkUri: string, verifyOptions: jose.JWTVerifyOptions = {}) {
    const JWK = jose.createRemoteJWKSet(new URL(jwkUri));
    return await jose.jwtVerify(jwt, JWK, verifyOptions);
}

export async function signJWT(payload: any, jwk: jose.JWK, iss: string = 'issuer', aud: string = 'audience'): Promise<string> {
    const alg = 'RS256';
    const privateKey = await jose.importJWK(jwk, alg);
    return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setIssuer(iss)
        .setAudience(aud)
        .setExpirationTime('1h')
        .sign(privateKey);
}