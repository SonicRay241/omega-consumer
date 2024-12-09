import { Elysia, t } from "elysia";
import { SubscriptionManager } from "./lib/subscribe";
import { getProductPrice, setProductPrice } from "./db/product";

const manager = new SubscriptionManager<number>()
const app = new Elysia()

const defaultVariant = "250ml"

app.ws("/live-update/product/:productId/price", {
  async open(ws) {
    const { productId } = ws.data.params

    const currValue = manager.getValue(productId + defaultVariant)
    
    if (!currValue) {
      const productPrice = await getProductPrice(productId, defaultVariant)

      manager.updateValue(productId + defaultVariant, productPrice)
    }

    manager.subscribe(productId + defaultVariant, ws.id, (newValue) => {
      ws.send(newValue)
    })

    // Get updated value
    ws.send(manager.getValue(productId + defaultVariant))
  },

  async message(ws, message) {
    const { productId } = ws.data.params

    const currValue = manager.getValue(productId + message)
    
    if (!currValue) {
      const productPrice = await getProductPrice(productId, message)

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

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
