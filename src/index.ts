import { Elysia, t } from "elysia";
import { SubscriptionManager } from "./lib/subscribe";
import { getProductPrice, setProductPrice } from "./db/product";

const manager = new SubscriptionManager<number>()
const app = new Elysia()

app.ws("/live-update/product/:productId/price", {
  async open(ws) {
    const { productId } = ws.data.params

    const currValue = manager.getValue(productId)
    
    if (!currValue) {
      const productPrice = await getProductPrice(productId)

      manager.updateValue(productId, productPrice)
    }

    manager.subscribe(productId, ws.id, (newValue) => {
      ws.send(newValue)
    })

    // Get updated value
    ws.send(manager.getValue(productId))
  },

  close(ws, code, message) {
    manager.unsubscribe(ws.id)
  }
})

app.post("/product/:productId/price",
  ({ body, params }) => {
    setProductPrice(params.productId, body.price)
    manager.updateValue(params.productId, body.price)
  },
  {
    body: t.Object({
      price: t.Number()
    })
  }
)

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
