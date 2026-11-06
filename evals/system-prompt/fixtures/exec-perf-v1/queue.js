export function createQueue() {
  return { items: [], push(job) { this.items.push(job); } };
}
