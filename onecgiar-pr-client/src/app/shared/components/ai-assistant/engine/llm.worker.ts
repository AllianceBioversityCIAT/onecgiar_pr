/// <reference lib="webworker" />
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Runs the WebLLM engine off the main thread so generation never blocks the UI.
// The @angular/build:application (esbuild) builder bundles this file as a
// separate worker chunk from the `new Worker(new URL('./llm.worker', ...))` call.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => handler.onmessage(msg);
