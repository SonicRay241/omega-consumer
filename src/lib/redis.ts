import { createClient } from "redis";

export const redis = await createClient({
    url: process.env.REDIS_SERVICE_URI!
})
    .on('error', err => console.log('Redis Client Error', err))
    .connect();