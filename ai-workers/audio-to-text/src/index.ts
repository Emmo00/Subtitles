import { Ai } from '@cloudflare/ai';
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	AI: any;
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

interface RequestBody {
	url: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		let requestBody: RequestBody;
		try {
			requestBody = await request.json();
		} catch {
			return new Response("you're welcome", {
				headers: new Headers({
					'Content-Type': 'application/json',
					// Allow all origins
					'Access-Control-Allow-Origin': '*',
					// Optionally, you can also set other CORS headers
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				}),
			});
		}
		const res: any = await fetch(requestBody.url);
		const blob = await res.arrayBuffer();

		const ai = new Ai(env.AI);
		const input = {
			audio: [...new Uint8Array(blob)],
		};

		const data = await ai.run('@cf/openai/whisper', input);
		const resBody = JSON.stringify({ data });

		return new Response(resBody, {
			headers: new Headers({
				'Content-Type': 'application/json',
				// Allow all origins
				'Access-Control-Allow-Origin': '*',
				// Optionally, you can also set other CORS headers
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			}),
		});
	},
};
