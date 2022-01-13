const milliseconds_per_second = 1000;
const milliseconds_per_minute = milliseconds_per_second * 60; // 60000
const milliseconds_per_5_minutes = milliseconds_per_minute * 5; // 300000
const milliseconds_per_15_minutes = milliseconds_per_5_minutes * 3; // 900000
const milliseconds_per_hour = milliseconds_per_15_minutes * 4; // 3600000
const milliseconds_per_day = milliseconds_per_hour * 24; // 86400000
const milliseconds_per_3_days = milliseconds_per_day * 3; // 259200000
const milliseconds_per_week = milliseconds_per_day * 7; // 604800000
const milliseconds_per_2_weeks = milliseconds_per_week * 2; // 1209600000
const milliseconds_per_month = milliseconds_per_day * 30; // 2592000000
const milliseconds_per_quarter = milliseconds_per_day * 90; // 7776000000

export type Interval_String = "5 minutes" | "15 minutes" | "1 hour" | "1 day";

export type Interval_Number = 300000 | 900000 | 3600000 | 86400000

export type Range_String = "Last 24 hours" | "Last 3 Days" | "Last Week" | "Last 2 Weeks";

export type Range_Number = 86400000 | 259200000 | 604800000 | 1209600000