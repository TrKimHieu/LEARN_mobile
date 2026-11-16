// IDs for disposable mock data only; never used for real authentication.
let sequence = 0;
function randomUUID() {
  const suffix = (++sequence).toString(16).padStart(12, '0');
  return 'xxxxxxxx-xxxx-4xxx-yxxx-'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  }) + suffix;
}
module.exports = { randomUUID };
