import { Interval, Range_Number } from "./intervalType";

export interface Graph
{
    id?: number,
    symbol: string,
    range_type: "Fixed" | "Relative",
    range_number: Range_Number,
    start: Date,
    end: Date,
    interval: Interval,
}