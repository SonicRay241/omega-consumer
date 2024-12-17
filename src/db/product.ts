import { redis } from "../lib/redis"

export function setProductPrice(id: string, variant: string, newPrice: number, TTL: number = 600) {
    redis.set(`PRODUCT_PRICE::${id}::${variant}`, newPrice.toString(), { EX: TTL })
    // console.log(`Updated product ${id} with variant ${variant} to ${newPrice}`)
    // Update db
}

export async function getProductPrice(id: string, variant: string, webUrl: string) {
    const cachedPrice = await redis.get(`PRODUCT_PRICE::${id}::${variant}`)

    if (!cachedPrice) {
        const req = await fetch(webUrl + "/api/price", {
            method: "POST",
            body: JSON.stringify({
                uid: id,
                variant: variant,
            }),
        });
        const res = await req.json() as { price: number }
        const newPrice = res.price
        setProductPrice(id, variant, newPrice)

        return newPrice
    }

    return +cachedPrice
}

export async function getCompetitorPrice(id: string, webUrl: string) {
    const req = await fetch(webUrl + "/api/price/competitor", {
        method: "POST",
        body: JSON.stringify({
            uid: id,
        }),
    });
    const res = await req.json() as { price: number }
    return res.price
}

export async function getVariantFromId(id: string, webUrl: string) {
    const req = await fetch(webUrl + "/api/product/variant", {
        method: "POST",
        body: JSON.stringify({
            uid: id,
        })
    });

    const res = await req.json() as { variant: string }
    return res.variant
}

export async function getDefaultVariant(id: string, webUrl: string): Promise<string> {
    const req = await fetch(webUrl + "/api/product/default-variant", {
        method: "POST",
        body: JSON.stringify({
            uid: id,
        }),
    });

    const res = await req.json() as { variant: string }
    return res.variant
}