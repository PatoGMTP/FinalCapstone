export interface List{
    symbols:string[],
    'response-type': "list"
}
export interface Historical{
"response-type": "historical",
data:
    { 
        symbol:string,
        data: DataPoint[]
    }[]
}

export interface Live
{
    "response-type": "live",
    "new-value":
    { 
            symbol: string,
            data: DataPoint[]
    }
}

export interface Live_N
{
    "response-type": "live",
    "new-value":
    { 
            symbol: string,
            data: DataPoint_N[]
    }
}

export interface DataPoint{
    timestamp: Date,
    open: string,
    high: string,
    low: string,
    close: string,
}

export interface DataPoint_N
{
    timestamp: Date,
    open: number,
    high: number,
    low: number,
    close: number,
}

const SERVER_DATA_FREQUENCY = 60_000;

export {SERVER_DATA_FREQUENCY};