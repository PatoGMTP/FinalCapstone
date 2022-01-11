export interface Graph
{
    id?: number,
    symbol: string,
    range_type: "fixed" | "relative",
    start: Date,
    end: Date,
    interval: "5 minutes" | "15 minutes" | "1 hour" | "1 day",
}