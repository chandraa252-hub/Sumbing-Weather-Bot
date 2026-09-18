export function getTime(): number {
    return Math.round(Date.now() / 1_000);
}