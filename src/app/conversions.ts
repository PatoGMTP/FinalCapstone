import { Interval_Number, Interval_String, Range_Number, Range_String } from "./intervalType";

const milliseconds_per_second = 1000;
const milliseconds_per_minute = milliseconds_per_second * 60; // 60000
const milliseconds_per_hour = milliseconds_per_minute * 60; // 3600000
const milliseconds_per_day = milliseconds_per_hour * 24; // 86400000
const milliseconds_per_week = milliseconds_per_day * 7; // 604800000
const milliseconds_per_month = milliseconds_per_day * 30; // 2592000000
const milliseconds_per_quarter = milliseconds_per_day * 90; // 7776000000

export const ranges: {value: Range_Number, view_value: Range_String}[] =
  [
    {value: 86400000, view_value: "Last 24 hours"},
    {value: 259200000, view_value: "Last 3 Days"},
    {value: 604800000, view_value: "Last Week"},
    {value: 1209600000, view_value: "Last 2 Weeks"},
  ]

  export const intervals: {value: Interval_Number, view_value: Interval_String}[] =
    [
      {value: 300000, view_value: "5 minutes"},
      {value: 900000, view_value: "15 minutes"},
      {value: 3600000, view_value: "1 hour"},
      {value: 86400000, view_value: "1 day"},
    ]

export const range_n_to_s: {[N in Range_Number]: Range_String} = {
    86400000 : "Last 24 hours",
    259200000 : "Last 3 Days",
    604800000 : "Last Week",
    1209600000 : "Last 2 Weeks",
  }

export const interval_s_to_n: {[K in Interval_String]: Interval_Number} =
{
  "5 minutes": 300000,
  "15 minutes": 900000,
  "1 hour": 3600000, 
  "1 day": 86400000,
}