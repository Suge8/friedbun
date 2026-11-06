import { enqueueLegacy, lease, MAX_ATTEMPTS } from "../src/queue.js";

for (let i = 0; i < MAX_ATTEMPTS; i++) enqueueLegacy({ seed: i });
console.log(lease());
