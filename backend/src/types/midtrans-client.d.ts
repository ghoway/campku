declare module "midtrans-client" {
  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
    expiry?: { start_time: string; unit: string; duration: number };
  }
  export interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }
  export interface CreateTransactionParams {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: any[];
  }
  export interface TransactionResult {
    token?: string;
    redirect_url?: string;
    status_code?: string;
  }
  export interface SnapOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }
  export class Snap {
    constructor(opts: SnapOptions);
    createTransaction(params: CreateTransactionParams): Promise<TransactionResult>;
    transaction: {
      status(orderId: string): Promise<any>;
    };
  }
  export interface CoreOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }
  export class CoreApi {
    constructor(opts: CoreOptions);
    charge(params: any): Promise<any>;
  }
}
