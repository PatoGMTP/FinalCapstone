import { Graph } from "./graphInt";
import { Investment } from "./investmentInt";

export interface Graph_Entry
{
    id?: number,
    created_at?: Date,
    owner?: string,
    options: Graph,
}

export interface Investment_Entry
{
    id?: number,
    created_at?: Date,
    owner?: string,
    options: Investment,
}