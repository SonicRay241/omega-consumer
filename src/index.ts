import { Elysia, t } from "elysia";
import { SubscriptionManager } from "./lib/subscribe";
import { getProductPrice, setProductPrice } from "./db/product";
import cron from "@elysiajs/cron";
import { AMQPClient } from "@cloudamqp/amqp-client";

const amqp = new AMQPClient(process.env.RABBIT_SERVICE_URI!)
const amqpConn = await amqp.connect()
const channel = await amqpConn.channel()
channel.basicQos(100)

const manager = new SubscriptionManager<number>()
const app = new Elysia()

const defaultVariant = "250ml" // fetch from db later

function updatePrices() {
  // Consume and aggregate
}

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

app.get("/consume-test", async () => {
  const a: (string | null)[] = []

  await channel.basicConsume(
    "stock-demand",
    {
      exclusive: false,
      noAck: false,
      args: {
        consumeOffset: "first"
      }
    },
    (message) => {
      try {
        if (message) {
          const messageBody = message.bodyToString();
          console.log("Received message:", messageBody);
          a.push(messageBody); // Push parsed object to the array
  
          channel.basicAck(message.deliveryTag, false); // Acknowledge message
        } else {
          console.error("Received a null or undefined message");
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }
  )

  return {
    queue: a,
  }
})

app.use(cron({
  name: "price-update",
  pattern: "0 * * * *",
  run() {
    console.log(`Updating Prices... [${(new Date()).toLocaleString()}]`)
    updatePrices()
  }
}))

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

app.onStop(() => {
  amqpConn.close()
  console.log("AMQP Connection Closed.")
})