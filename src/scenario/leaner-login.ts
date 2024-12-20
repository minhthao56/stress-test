import grpc, { Params } from 'k6/net/grpc';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import http from 'k6/http';


type GRPCType = {
    client: grpc.Client,
    options?: {
        req?: any,
        params?: Params
        successRate?: Rate,
        failureRate?: Rate,
        successCount?: Counter,
        failureCount?: Counter
    }
}

const KEY = process.env.FIREBASE_API_KEY;

export function verifyAppVersion({ client, options }: GRPCType) {
    const { params, successRate, failureRate, successCount, failureCount } = options || {};
    const responseVerifyAppVersion = client.invoke('mastermgmt.v1.VersionControlReaderService/VerifyAppVersion', {}, params);
    const verifyAppVersionSuccess = check(responseVerifyAppVersion, {
        'status is OK': (r) => r && r.status === grpc.StatusOK,
    });

    if (!verifyAppVersionSuccess) {
        console.log(`Failed to verify app version: ${JSON.stringify(responseVerifyAppVersion)}`);
    }

    successRate?.add(verifyAppVersionSuccess);
    failureRate?.add(!verifyAppVersionSuccess);
    verifyAppVersionSuccess ? successCount?.add(1) : failureCount?.add(1);
}


export function getAuthInfo({ client, options }: GRPCType) {
    const { params, successRate, failureRate, successCount, failureCount, req } = options || {};
    const responseGetAuthInfo = client.invoke('usermgmt.v2.AuthService/GetAuthInfo', req, params);
    const getAuthInfoSuccess = check(responseGetAuthInfo, {
        'status is OK': (r) => r && r.status === grpc.StatusOK,
    });
    if (!getAuthInfoSuccess) {
        console.log(`Failed to get auth info: ${JSON.stringify(responseGetAuthInfo)}`);
    }
    successRate?.add(getAuthInfoSuccess);
    failureRate?.add(!getAuthInfoSuccess);
    getAuthInfoSuccess ? successCount?.add(1) : failureCount?.add(1);
}

type HTTPType = {
    body: string,
    successRate: Rate,
    failureRate: Rate,
    successCount: Counter,
    failureCount: Counter
}


export function signInWithPassword ({ body, successRate, failureRate, successCount, failureCount }: HTTPType) {
    const urlRes = http.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, body);
    const signInWithPasswordSuccess = check(urlRes, {
        'status is OK': (r) => r && r.status === 200,
    });
    if (!signInWithPasswordSuccess) {
        console.log(`Failed to sign in with password: ${JSON.stringify(urlRes)}`);
    }
    successRate.add(signInWithPasswordSuccess);
    failureRate.add(!signInWithPasswordSuccess);
    signInWithPasswordSuccess ? successCount.add(1) : failureCount.add(1);
    const bodyResp = urlRes.body;
    const p = JSON.parse(bodyResp as string);
    const refreshToken = p.refreshToken;
    const token = p.idToken;
    return { refreshToken, token };
}

export function signInWithPasswordAndRefreshToken({ body, successRate, failureRate, successCount, failureCount }: HTTPType) {
    const urlRes = http.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, body);
    const bodyResp = urlRes.body;

    const signInWithPasswordSuccess = check(urlRes, {
        'status is OK': (r) => r && r.status === 200,
    });
    if (!signInWithPasswordSuccess) {
        console.log(`Failed to sign in with password: ${JSON.stringify(urlRes)}`);
    }
    const p = JSON.parse(bodyResp as string);
    const refreshToken = p.refreshToken;
    sleep(1);

    const payload = `grant_type=refresh_token&refresh_token=${refreshToken}`;
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const securetoken = http.post(`https://securetoken.googleapis.com/v1/token?key=${KEY}`, payload, { headers: headers });
    const secureTokenSuccess = check(securetoken, {
        'status is OK': (r) => r && r.status === 200,
    });
    if (!secureTokenSuccess) {
        console.log(`Failed to get secure token: ${JSON.stringify(securetoken)}`);
    }
    successRate.add(secureTokenSuccess);
    failureRate.add(!secureTokenSuccess);
    secureTokenSuccess ? successCount.add(1) : failureCount.add(1);
    const bodySecureToken = securetoken.body;
    const pSecureToken = JSON.parse(bodySecureToken as string);
    const access_token = pSecureToken.access_token;
    const refreshTokenSecureToken = pSecureToken.refresh_token;
    return {
        accessToken: access_token,
        refreshToken: refreshTokenSecureToken,
    };
}

export const refreshAccessToken = ({ body, successRate, failureRate, successCount, failureCount }: HTTPType) => {
    const json = JSON.parse(body);
    const payload = `grant_type=refresh_token&refresh_token=${json?.refreshToken}`;
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const securetoken = http.post("https://securetoken.googleapis.com/v1/token?key=${KEY}", payload, { headers: headers });
    const secureTokenSuccess = check(securetoken, {
        'status is OK': (r) => r && r.status === 200,
    });
    if (!secureTokenSuccess) {
        console.log(`Failed to get secure token: ${JSON.stringify(securetoken)}`);
    }
    successRate.add(secureTokenSuccess);
    failureRate.add(!secureTokenSuccess);
    secureTokenSuccess ? successCount.add(1) : failureCount.add(1);
    const bodySecureToken = securetoken.body;
    const pSecureToken = JSON.parse(bodySecureToken as string);
    const access_token = pSecureToken.access_token;
    const refreshToken = pSecureToken.refresh_token;
    return {
        accessToken: access_token,
        refreshToken,
    };
};


export function exchangeToken({ client, options }: GRPCType) {
    const { successRate, failureRate, successCount, failureCount, req } = options || {};

    const response = client.invoke(
        "bob.v1.UserModifierService/ExchangeToken",
        req
    );
    const exchangeTokenSuccess = check(response, {
        "status is OK": (r) => r && r.status === grpc.StatusOK,
    });
    if (!exchangeTokenSuccess) {
        console.log(`Failed to exchange token: ${JSON.stringify(response)}`);
    }
    successRate?.add(exchangeTokenSuccess);
    failureRate?.add(!exchangeTokenSuccess);
    exchangeTokenSuccess ? successCount?.add(1) : failureCount?.add(1);
}