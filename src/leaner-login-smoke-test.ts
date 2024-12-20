import grpc from "k6/net/grpc";
import {  sleep } from "k6";
import { Options } from "k6/options";
import { Rate, Counter } from "k6/metrics";
import {
	exchangeToken,
	getAuthInfo,
	signInWithPasswordAndRefreshToken,
	verifyAppVersion,
} from "./scenario/leaner-login";

export let options: Options = {
	vus: 3, // Key for Smoke test. Keep it at 2, 3, max 5 VUs
  	duration: '10s', // This can be shorter or just a few iterations
	thresholds: {
		http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
		success_rate: ["rate>0.95"], // 95% of requests should be successful
	},
	summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)"],
};

const client = new grpc.Client();
client.load(
	[""],
	"../users.proto",
	"../version_control.proto",
	"../auth.proto"
);

const successRate = new Rate("success_rate");
const failureRate = new Rate("failure_rate");
const successCount = new Counter("success_count");
const failureCount = new Counter("failure_count");

const params = {
	metadata: {
		pkg: "com.manabie.learner",
		version: "2.3.20241217081122",
	},
};


export default () => {
	try {
		client.connect("web-api.prep.tokyo.manabie.io:443", {});

		verifyAppVersion({
			client,
			options: { params, successRate, failureRate, successCount, failureCount },
		});
		sleep(3);

		const req = {
			username: "mt123",
			domain_name: "e2e-tokyo",
		};
		getAuthInfo({
			client,
			options: { req, successRate, failureRate, successCount, failureCount },
		});
		sleep(1);

		const body = JSON.stringify({
			returnSecureToken: true,
			email: "01JF25AFTZE9QJ1MN77KA372P2@manabie.com",
			password: "Q9H7F6",
			clientType: "CLIENT_TYPE_WEB",
			tenantId: "pre-e2e-tokyo-ieqih",
		});

		const access_token = signInWithPasswordAndRefreshToken({
			body,
			successRate,
			failureRate,
			successCount,
			failureCount,
		});
		sleep(1);

		const data = { token: access_token };
		
		exchangeToken({
			client,
			options: { req: data, successRate, failureRate, successCount, failureCount },
		})
		client.close();
		sleep(1);
	} catch (error) {
		console.error("Error occurred:", error);
		failureRate.add(1);
		failureCount.add(1);
	}
};
