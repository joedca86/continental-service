const amqp = require('amqplib');
const queueRecreatePayment = 'contipayRecreatePayment';

const env = process.env.NODE_ENV || "development";
const config = require('../../config/config.json')[env];
const connectionStringRabbitMQ = config.rabbitmq.url;

const sql = require('mssql');
const createConnection = (config) => new sql.ConnectionPool(config).connect();

class ContipayQueue {

    static async init() {
        try {
            const connectionRabbitMQ = await amqp.connect(connectionStringRabbitMQ);
            const channelRecreatePaymentPublisher = await connectionRabbitMQ.createChannel();
            await channelRecreatePaymentPublisher.assertQueue(queueRecreatePayment);
            this.channelRecreatePaymentPublisher = channelRecreatePaymentPublisher;
            console.log('*** contipay - rabbitmq initialized successfully');
        } catch (error) {
            console.log('*** contipay - rabbitmq error on initialice', error);
            throw error;
        }
    }

    static async addToRecreatePayment(req, content) {
        if (this.channelRecreatePaymentPublisher) {
            let pool;
            try {
                
                pool = await createConnection(req.app.get('dbConfig'));

                const requestDB = pool.request();
                requestDB.input('p_IDPago', sql.VarChar(50), content.paymentId);
                const result = await requestDB.execute('[CAJ].[sp_EncolarPago]');

                const { ok, IDPagoQueue } = result.recordset[0];

                 if (ok) {
                     Object.assign(content, { IDPagoQueue });
                     this.channelRecreatePaymentPublisher.sendToQueue(queueRecreatePayment, Buffer.from(JSON.stringify(content)));
                 }
            } catch (error) {
                console.log(`${new Date().toLocaleString()} *** addToRecreatePayment`, error);
            } finally {
                if (pool) await pool.close();
            }
            
        }
    }
}


module.exports = ContipayQueue
