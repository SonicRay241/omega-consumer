import { Elysia, t } from "elysia";
import { SubscriptionManager } from "./lib/subscribe";
import { getCompetitorPrice, getDefaultVariant, getProductPrice, getVariantFromId, setProductPrice } from "./db/product";
import cron from "@elysiajs/cron";
import { CounterManager } from "./lib/counter";
import { setupConsumer } from "./lib/amqp";

const startHour = new Date()
const webUrl = process.env.WEB_URL!
const aiUrl = process.env.AI_URL!
const secretKey = process.env.SECRET_KEY!

startHour.setHours(startHour.getHours() - (startHour.getMinutes() > 0 ? 0 : 1))
startHour.setMinutes(0, 0, 0)

const manager = new SubscriptionManager<number>()
const counter = new CounterManager()

setupConsumer(
  (idVar, amount) => {
    counter.add(idVar, amount)
  },
  startHour
)

const app = new Elysia()

app.ws("/live-update/product/:productId/price", {
  async open(ws) {
    const { productId } = ws.data.params

    const defaultVariant = await getDefaultVariant(productId, webUrl)

    const currValue = manager.getValue(productId + ":" + defaultVariant)

    if (!currValue) {
      const productPrice = await getProductPrice(productId, defaultVariant, webUrl)

      manager.updateValue(productId + ":" + defaultVariant, productPrice)
    }

    manager.subscribe(productId + ":" + defaultVariant, ws.id, (newValue) => {
      ws.send(newValue)
    })

    // Get updated value
    ws.send(manager.getValue(productId + ":" + defaultVariant))
  },

  async message(ws, message) {
    const { productId } = ws.data.params

    const currValue = manager.getValue(productId + message)

    if (!currValue) {
      const productPrice = await getProductPrice(productId, message, webUrl)

      manager.updateValue(productId + message, productPrice)
    }

    manager.resubscribe(productId + message, ws.id, (newValue) => {
      ws.send(newValue)
    })

    ws.send(manager.getValue(productId + message))
  },

  close(ws, code, message) {
    manager.unsubscribe(ws.id)
  },

  body: t.String()
})

app.post("/product/:productId/price",
  ({ body, params }) => {
    setProductPrice(params.productId, body.variant, body.price)
    manager.updateValue(params.productId + body.variant, body.price)
  },
  {
    body: t.Object({
      price: t.Number(),
      variant: t.String()
    })
  }
)

async function updatePrice() {
  console.log(`Updating Prices... [${(new Date()).toLocaleString()}]`)
  const counterObj = counter.getAll()
  console.log(counterObj);

  for (const key in counterObj) {
    const [id, variantId] = key.split(":")

    const variantName = await getVariantFromId(variantId, webUrl)
    console.log(variantName);

    const competitorPrice = await getCompetitorPrice(id, webUrl)
    const demandRate = counterObj[key]
    const basePrice = await getProductPrice(id, variantName, webUrl)

    const req = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      body: JSON.stringify({
        demandRate: demandRate,
        competitorPrice: competitorPrice,
        basePrice: basePrice,
        secretKey: secretKey
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(req.status);


    const res = await req.json() as { finalPrice: number }
    console.log(res);


    manager.updateValue(id + ":" + variantName, res.finalPrice)
  }
  counter.clear()
}

app.post("/dev/update-price",
  ({ body }) => {
    if (body.key == secretKey) {
      updatePrice()
      return {
        message: "success"
      }
    }
    return {
      message: "..."
    }
  },
  {
    body: t.Object({
      key: t.String()
    })
  }
)

app.use(cron({
  name: "price-update",
  pattern: "0 * * * *",
  async run() {
    await updatePrice()
  }
}))

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);