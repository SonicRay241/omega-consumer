import { redis } from "../lib/redis"

export function setProductPrice(id: string, newPrice: number) {
    redis.set(`PRODUCT_PRICE::${id}`, newPrice.toString())

    // Update db
}

export async function getProductPrice(id: string) {
    const cachedPrice = await redis.get(`PRODUCT_PRICE::${id}`)

    if (!cachedPrice) {
        const newPrice = 30000 // change to db logic, (maybe prisma, idk)
        setProductPrice(id, newPrice)

        return newPrice
    }

    return +cachedPrice
}