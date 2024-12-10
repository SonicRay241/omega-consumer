import { redis } from "../lib/redis"

export function setProductPrice(id: string, variant: string, newPrice: number, TTL: number = 600) {
    redis.set(`PRODUCT_PRICE::${id}::${variant}`, newPrice.toString(), { EX: TTL })
    console.log(`Updated product ${id} with variant ${variant} to ${newPrice}`)
    // Update db
}

export async function getProductPrice(id: string, variant: string) {
    const cachedPrice = await redis.get(`PRODUCT_PRICE::${id}::${variant}`)

    if (!cachedPrice) {
        const newPrice = 30000 // change to db logic, (maybe prisma, idk)
        setProductPrice(id, variant, newPrice)

        return newPrice
    }

    return +cachedPrice
}