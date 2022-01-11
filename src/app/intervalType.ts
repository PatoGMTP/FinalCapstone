export type Interval = "5 minutes" | "15 minutes" | "1 hour" | "1 day";

export type Range_String = "Last 24 hours" | "Last Week" | "Last Month" | "Last Quarter";

const milliseconds_per_second = 1000;
const milliseconds_per_minute = milliseconds_per_second * 60; // 60000
const milliseconds_per_hour = milliseconds_per_minute * 60; // 3600000
const milliseconds_per_day = milliseconds_per_hour * 24; // 86400000
const milliseconds_per_week = milliseconds_per_day * 7; // 604800000
const milliseconds_per_month = milliseconds_per_day * 30; // 2592000000
const milliseconds_per_quarter = milliseconds_per_day * 90; // 7776000000

export type Range_Number = 86400000 | 604800000 | 2592000000 | 7776000000