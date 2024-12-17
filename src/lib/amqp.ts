import { AMQPClient, AMQPChannel } from "@cloudamqp/amqp-client";
import { AMQPBaseClient } from "@cloudamqp/amqp-client/types/amqp-base-client";
import { CheckoutData } from "./types";

const RABBIT_URI = process.env.RABBIT_SERVICE_URI!;
let amqp: AMQPClient;
let connection: AMQPBaseClient;
let channel: AMQPChannel;

export async function setupConsumer(
    callback: (
        productId: string,
        amount: number
    ) => void,
    offset: string | number | Date
) {
    try {
        // Connect to RabbitMQ
        amqp = new AMQPClient(RABBIT_URI);
        amqp.heartbeat = 30;

        connection = await amqp.connect();
        console.log("Connected to RabbitMQ");

        // Create a channel
        channel = await connection.channel();
        await channel.basicQos(10);

        // Declare consumer
        console.log("Starting consumer...");
        await channel.basicConsume(
            "stock-demand",
            {
                exclusive: false,
                noAck: false,
                args: { "x-stream-offset": offset },
            },
            (message) => {
                try {
                    if (message) {
                        const strmessage = message.bodyToString()

                        console.log("Received:", strmessage);

                        if (strmessage) {
                            const jsonified = JSON.parse(strmessage) as CheckoutData

                            callback(jsonified.uid + ":" + jsonified.variant, jsonified.demandDelta)
                        }

                        channel.basicAck(message.deliveryTag, false);
                    }
                } catch (err) {
                    console.error("Error processing:", err);
                    channel.basicNack(message.deliveryTag, false, true); // Requeue
                }
            }
        );

        console.log("Consumer setup complete.");
    } catch (error) {
        console.error("Error in consumer setup:", error);
        setTimeout(() => setupConsumer(callback, offset), 5000); // Reconnect logic
    }

    // Handle connection or channel failures
    // connection.cl, () => {
    //     console.warn("Connection closed, reconnecting...");
    //     setupConsumer();
    // });

    connection.onerror = (err) => {
        console.error("Connection error:", err);
        setupConsumer(callback, offset)
    }
}